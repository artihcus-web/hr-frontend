import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMoreVertical,
  FiPlus,
  FiSave,
  FiX
} from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../common/LoadingSpinner";

import ConfirmModal from '../common/ConfirmModal';

// Helper to get ISO week number
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

// Get all weeks that overlap with the current month
const getWeeksForMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Start from the first day of the month
  const firstDayOfMonth = new Date(year, month, 1);

  // Find the Monday of the week containing the 1st
  const day = firstDayOfMonth.getDay();
  const diff = firstDayOfMonth.getDate() - day + (day === 0 ? -6 : 1);

  let currentMonday = new Date(firstDayOfMonth);
  currentMonday.setDate(diff);

  const weeks = [];

  // Ensure we don't go into infinite loop
  for (let i = 0; i < 6; i++) {
    const weekNum = getWeekNumber(currentMonday);

    // Filter out previous year weeks (e.g. W52/W53) when viewing January
    if (month === 0 && weekNum > 50) {
      currentMonday.setDate(currentMonday.getDate() + 7);
      continue;
    }

    weeks.push({
      weekNum: weekNum,
      startDate: new Date(currentMonday),
      label: `W${weekNum}`
    });

    currentMonday.setDate(currentMonday.getDate() + 7);

    if (currentMonday.getMonth() > month && currentMonday.getFullYear() === year) break;
    if (currentMonday.getFullYear() > year) break;
  }

  return weeks;
};

const Timesheet = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  // State for Week Navigation
  const [weekRange, setWeekRange] = useState({ start: null, end: null });

  // Navigation Restriction Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Current week start (Monday) - used to block editing for past weeks (e.g. W1/W2)
  const currentDay = today.getDay();
  const currentDiff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(currentDiff);
  currentWeekStart.setHours(0, 0, 0, 0);

  // Allow editing only for: current week + previous week (e.g. allow W3, lock W1/W2)
  const earliestEditableWeekStart = new Date(currentWeekStart);
  earliestEditableWeekStart.setDate(earliestEditableWeekStart.getDate() - 7);

  // Calculate if next week is strictly in the future
  const nextWeekStart = weekRange?.start ? new Date(weekRange.start) : new Date();
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const isNextDisabled = nextWeekStart > today;

  // Allow navigation to previous weeks (removed restriction)
  const isPrevDisabled = false;

  const isLockedWeekSelected = (() => {
    if (!weekRange?.start) return false;
    const ws = new Date(weekRange.start);
    ws.setHours(0, 0, 0, 0);
    return ws < earliestEditableWeekStart;
  })();

  const [currentDateVal, setCurrentDateVal] = useState(new Date().toISOString().split('T')[0]);

  // Available Projects (fetched from API)
  const [availableProjects, setAvailableProjects] = useState([]);

  // Manager Name
  const [managerName, setManagerName] = useState("Loading...");

  // Loading States for Buttons
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timesheetFetched, setTimesheetFetched] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success", // success or confirm
    onConfirm: null
  });

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Fetch Projects and User Details (including Manager)
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        // Fetch projects and user details in parallel
        const [projectsRes, userRes] = await Promise.all([
          axiosInstance.get('/api/projects/my-projects'),
          axiosInstance.get('/api/auth/me')
        ]);

        setAvailableProjects(projectsRes.data.projects || []);

        // Determine Manager Name
        let displayManager = "Not Assigned";
        const projects = projectsRes.data.projects || [];
        const isReadyToDeploy = projects.find(p => p.projectName === 'Ready-to-deploy resources');

        let mappedManager = null;
        if (isReadyToDeploy) {
          // Check for specific mapping
          const myAssignment = isReadyToDeploy.managerAssignments?.find(
            a => a.employee?._id === user._id || a.employee?._id === user.id ||
              a.employee?.employeeId === user.employeeId
          );

          if (myAssignment && myAssignment.manager) {
            mappedManager = myAssignment.manager.fullName || myAssignment.manager.username;
          }
        }

        if (mappedManager) {
          // Priority 1: Mapped HR (if on bench/ready-to-deploy)
          displayManager = mappedManager;
        } else if (userRes.data.user?.managerName) {
          // Priority 2: Direct Manager (Assigned by Admin)
          displayManager = userRes.data.user.managerName;
        } else {
          // Priority 3: Project Manager (from assigned projects)
          // Exclude Ready-to-deploy if looking for generic PM, passing over it if no mapping found
          const activeProject = projects.find(p => p.projectName !== 'Ready-to-deploy resources' && p.projectManagers?.length > 0);

          if (activeProject) {
            const pm = activeProject.projectManagers[0];
            displayManager = pm.fullName || pm.username;
          } else if (isReadyToDeploy && isReadyToDeploy.projectManagers?.length > 0) {
            // Fallback: First HR in Ready-to-deploy if no specific mapping
            const pm = isReadyToDeploy.projectManagers[0];
            displayManager = pm.fullName || pm.username;
          }
        }

        setManagerName(displayManager);

      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    if (user && token) fetchData();
  }, [user, token]);

  const userInitials = getInitials(user?.fullName);




  // State for Timesheet Data
  const [rows, setRows] = useState([]);
  const [monthlyTimesheets, setMonthlyTimesheets] = useState([]);

  // Totals


  // Helper to format date range
  const formatDateRange = (start, end) => {
    if (!start || !end) return "";
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
  };

  // Helper to get week days
  const getWeekDays = (startDate) => {
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d.getDate().toString().padStart(2, '0'),
        name: dayNames[i],
        fullDate: d
      });
    }
    return days;
  };

  const [weekDays, setWeekDays] = useState([]);



  // Initial load
  useEffect(() => {
    // Initialize current week based on date picker or today
    const now = new Date(currentDateVal);
    // Adjust to Monday
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setWeekRange({ start: monday, end: sunday });
    setWeekDays(getWeekDays(monday));
  }, [currentDateVal]);

  const handleDateChange = (e) => {
    setCurrentDateVal(e.target.value);
    // Logic to find which week index this date corresponds to could be added here
    // For now, simpler to just set the week range around this date
  };

  // Helper to parse duration string to minutes
  // Helper to parse duration string to minutes
  const parseDuration = (str) => {
    if (!str || str === 'WO' || str === 'FL') return 0;
    // Try colon format first "8 : 00"
    let match = str.match(/(\d+)\s?:\s?(\d+)/);
    if (!match) {
      // Try old format "8 : 00"
      match = str.match(/(\d+)h (\d+)m/);
    }

    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  };

  // Helper to format minutes to duration string
  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} : ${String(m).padStart(2, '0')}`;
  };






  // Fetch saved timesheet data when week changes
  // Fetch saved timesheet data when week changes
  useEffect(() => {
    const fetchTimesheetData = async () => {
      if (!token || !weekRange.start) return;

      // Reset fetched state when refetching
      setTimesheetFetched(false);

      try {
        const res = await axiosInstance.get('/api/timesheet/my-timesheets');

        const allTimesheets = res.data.timesheets || [];
        setMonthlyTimesheets(allTimesheets);

        // Filter by current week start date
        const currentWeekStartStr = weekRange.start.toISOString().split('T')[0];

        const currentWeekSheets = allTimesheets.filter(ts => {
          const tsDate = new Date(ts.weekStartDate).toISOString().split('T')[0];
          return tsDate === currentWeekStartStr;
        });

        const getStatusDisplay = (rawStatus) => {
          if (!rawStatus) return "Saved";
          let display = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
          if (rawStatus === 'rejected-edit') display = "Changes Requested";
          return display;
        };

        if (currentWeekSheets.length > 0) {
          // Consolidated Timesheet Logic:
          // We expect one document per week, containing entries for multiple projects.
          // We need to flatten this back into 'rows' for the UI (one row per Project+ChargeCode).

          let loadedRows = [];

          // Assuming we only care about the first matching timesheet for this week (should be unique)
          const validSheet = currentWeekSheets[0];

          if (validSheet && validSheet.entries && validSheet.entries.length > 0) {
            // Group entries by unique key (ProjectID + ChargeCode)
            const groups = {};

            validSheet.entries.forEach(entry => {
              const key = `${entry.projectId || 'unknown'}-${entry.chargeCode || 'General'}`;
              if (!groups[key]) {
                groups[key] = {
                  projectId: entry.projectId, // Keep original ID if needed
                  projectName: entry.projectName || validSheet.projectName || "",
                  chargeCode: entry.chargeCode || "General",
                  entries: []
                };
              }
              groups[key].entries.push(entry);
            });

            // Convert groups to rows
            loadedRows = Object.values(groups).map((group, idx) => {
              return {
                id: idx + 1,
                chargeCode: group.chargeCode,
                description: group.projectName, // This fetches the project name cached in entry or uses a fallback
                projectId: group.projectId,     // Important for matching later
                avatar: user?.avatar,
                initials: getInitials(user?.fullName || "User"),
                status: getStatusDisplay(validSheet.status), // Status is at document level
                rejectionReason: validSheet.rejectionReason,

                // Map entries to daily columns
                dailyHours: Array(7).fill("0 : 00").map((_, i) => {
                  const entry = group.entries.find(e => {
                    const d = new Date(e.date);
                    const dayIndex = (d.getDay() + 6) % 7; // Mon=0
                    return dayIndex === i;
                  });
                  if (!entry) return "0 : 00";

                  // Convert minutes/hours to display format
                  // Handle existing format or raw numbers if backend changed
                  const val = entry.hoursCompleted || entry.totalDailyHours || 0;

                  // If it's already a string like "8 : 00", use it. If number, format it.
                  if (typeof val === 'string' && val.includes(':')) return val;

                  // If it's a number (e.g. 8.5), convert to "8 : 30"
                  // For now, assuming standard format retrieval
                  return entry.hoursCompleted || "0 : 00";
                }),

                dailyComments: Array(7).fill("").map((_, i) => {
                  const entry = group.entries.find(e => {
                    const d = new Date(e.date);
                    const dayIndex = (d.getDay() + 6) % 7;
                    return dayIndex === i;
                  });
                  return entry ? entry.comment || "" : "";
                }),

                totalHours: "0 : 00" // Will be calculated by UI or we can calc here
              };
            });

            // Recalculate row totals
            loadedRows = loadedRows.map(r => ({
              ...r,
              totalHours: formatDuration(r.dailyHours.reduce((acc, val) => acc + parseDuration(val), 0))
            }));

          } else if (validSheet) {
            // Sheet exists but no entries? (Rare case, maybe just created)
            // Treat as empty
            loadedRows = [];
          }

          // If we have a validated sheet, set it
          setRows(loadedRows);
        } else {
          // Auto-fill logic: All Assigned Projects + Self Learning
          // Auto-fill logic: All Assigned Projects + Self Learning
          let initialRows = [];
          if (availableProjects.length > 0) {
            initialRows = availableProjects.map((proj, idx) => ({
              id: idx + 1,
              chargeCode: `${proj.projectId}-${proj.projectName}`,
              description: proj.description || proj.projectName,
              projectId: proj._id, // Explicitly set ObjectId for reliable backend routing
              avatar: user?.avatar,
              initials: getInitials(user?.fullName || "User"),
              status: "Draft",
              dailyHours: Array(7).fill("0 : 00"),
              dailyComments: Array(7).fill(""),
              totalHours: "0 : 00"
            }));
          }

          // Append Self Learning (Always)
          initialRows.push({
            id: initialRows.length + 1,
            chargeCode: "Self Learning",
            description: "Self Learning",
            avatar: user?.avatar,
            initials: getInitials(user?.fullName || "User"),
            status: "Draft",
            dailyHours: Array(7).fill("0 : 00"),
            totalHours: "0 : 00"
          });

          // Append Half Day Leave (Always)
          initialRows.push({
            id: initialRows.length + 1,
            chargeCode: "Half Day Leave",
            description: "Half Day Leave",
            avatar: user?.avatar,
            initials: getInitials(user?.fullName || "User"),
            status: "Draft",
            dailyHours: Array(7).fill("0 : 00"),
            totalHours: "0 : 00"
          });

          // Append Full Day Leave (Always)
          initialRows.push({
            id: initialRows.length + 1,
            chargeCode: "Full Day Leave",
            description: "Full Day Leave",
            avatar: user?.avatar,
            initials: getInitials(user?.fullName || "User"),
            status: "Draft",
            dailyHours: Array(7).fill("0 : 00"),
            totalHours: "0 : 00"
          });

          setRows(initialRows);


        }
        setTimesheetFetched(true);

      } catch (err) {
        console.error("Failed to fetch timesheets:", err);
        toast.error("Failed to load saved timesheets");
        setTimesheetFetched(true); // Mark as fetched even on error so we don't hang
      }
    };

    fetchTimesheetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRange.start, token, user]); // Removed availableProjects dependency intentionally

  // Separate effect to handle delayed auto-fill (when projects load AFTER timesheet fetch)
  useEffect(() => {
    // Hydrate projects if they loaded late or if only Self Learning/Leave rows exist (handled when proj array > 0)
    // Check if we are missing project rows
    const hasProjects = rows.some(r => r.chargeCode !== 'Self Learning' && r.chargeCode !== 'Half Day Leave' && r.chargeCode !== 'Full Day Leave');

    if (timesheetFetched && !hasProjects && availableProjects.length > 0) {
      const initialRows = availableProjects.map((proj, idx) => ({
        id: idx + 1,
        chargeCode: `${proj.projectId}-${proj.projectName}`,
        description: proj.description || proj.projectName,
        projectId: proj._id, // Add explicit ID
        avatar: user?.avatar,
        initials: getInitials(user?.fullName || "User"),
        status: "Draft",
        dailyHours: Array(7).fill("0 : 00"),
        totalHours: "0 : 00"
      }));

      // Append Self Learning
      initialRows.push({
        id: initialRows.length + 1,
        chargeCode: "Self Learning",
        description: "Self Learning",
        avatar: user?.avatar,
        initials: getInitials(user?.fullName || "User"),
        status: "Draft",
        dailyHours: Array(7).fill("0 : 00"),
        totalHours: "0 : 00"
      });

      // Append Half Day Leave
      initialRows.push({
        id: initialRows.length + 1,
        chargeCode: "Half Day Leave",
        description: "Half Day Leave",
        avatar: user?.avatar,
        initials: getInitials(user?.fullName || "User"),
        status: "Draft",
        dailyHours: Array(7).fill("0 : 00"),
        totalHours: "0 : 00"
      });

      // Append Full Day Leave
      initialRows.push({
        id: initialRows.length + 1,
        chargeCode: "Full Day Leave",
        description: "Full Day Leave",
        avatar: user?.avatar,
        initials: getInitials(user?.fullName || "User"),
        status: "Draft",
        dailyHours: Array(7).fill("0 : 00"),
        totalHours: "0 : 00"
      });

      setRows(initialRows);
    }
  }, [timesheetFetched, rows, availableProjects, user]);



  const currentMonthWeeks = React.useMemo(() => {
    if (!weekRange.start) return [];
    // We want the weeks for the month of the CURRENTLY SELECTED week
    // Use weekRange.start or weekRange.end to judge the "primary" month?
    // Usually the month of the Thursday of the week determines the Week's month ownership in ISO?
    // Let's just use the month of the start date + 3 days (middle of week)
    const midWeek = new Date(weekRange.start);
    midWeek.setDate(midWeek.getDate() + 3);
    return getWeeksForMonth(midWeek);
  }, [weekRange.start]);






  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null); // { type: 'week' | 'route', payload: ... }

  // Detect unsaved changes on window close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept link clicks and navigation attempts when there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e) => {
      // Check if clicking on a navigation link (React Router Link or regular anchor)
      const link = e.target.closest('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        // Only intercept if it's a route navigation (starts with /) and not the current timesheet page
        if (href && href.startsWith('/') && href !== '/timesheet' && !href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation({ type: 'route', payload: { to: href } });
          setShowUnsavedAlert(true);
        }
      }
    };

    // Use capture phase to intercept before React Router handles it
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  // Intercept week changes
  const attemptWeekNavigation = (action, payload) => {
    if (isDirty) {
      setShowUnsavedAlert(true);
      setPendingNavigation({ type: action, payload });
    } else {
      executeNavigation(action, payload);
    }
  };

  const executeNavigation = (action, payload) => {
    if (action === 'shift') {
      const direction = payload;
      const newStart = new Date(weekRange.start);
      newStart.setDate(weekRange.start.getDate() + (direction * 7));

      const newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + 6);

      setWeekRange({ start: newStart, end: newEnd });
      setWeekDays(getWeekDays(newStart));

      // Active week index logic for pills is now derived
    } else if (action === 'pill') {
      // payload is the startDate of the target week
      const newStart = new Date(payload);
      const newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + 6);

      setWeekRange({ start: newStart, end: newEnd });
      setWeekDays(getWeekDays(newStart));
    } else if (action === 'route') {
      // Navigate to the route
      if (payload.to) {
        navigate(payload.to, payload.options);
      }
    }

    // Reset form state after successful navigation
    if (action !== 'route') {
      setRows([]);
    }
    setIsDirty(false);
    setShowUnsavedAlert(false);
    setPendingNavigation(null);
    if (action === 'route') {
      // Don't show toast for route navigation
    } else {
      toast.success("Week switched");
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      executeNavigation(pendingNavigation.type, pendingNavigation.payload);
    }
  };

  // UI Toggles
  const [showAddRowForm, setShowAddRowForm] = useState(false);
  // Removed showLeavesDropdown
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [selectedProjectCode, setSelectedProjectCode] = useState("");
  const [activeRowMenu, setActiveRowMenu] = useState(null); // rowId of active menu

  const handleCancelNavigation = () => {
    setShowUnsavedAlert(false);
    setPendingNavigation(null);
  };

  const _handleAddRow = () => {
    setShowAddRowForm(true);
  };
  const confirmAddRow = () => {
    if (!selectedProjectCode) {
      toast.error("Please select a valid Project Code");
      return;
    }
    const project = availableProjects.find(p => p.projectId === selectedProjectCode);
    setIsDirty(true);
    const newRow = {
      id: rows.length + 1,
      chargeCode: project ? `${project.projectId}-${project.projectName}` : selectedProjectCode,
      description: project?.description || "New Project Task...",
      projectId: project?._id, // Add explicit ID
      avatar: user?.avatar,
      initials: getInitials(user?.fullName || "User"),
      status: "",
      dailyHours: Array(7).fill("0 : 00"),
      totalHours: "0 : 00"
    };
    setRows([...rows, newRow]);
    setShowAddRowForm(false);
    setSelectedProjectCode(""); // Reset selection
    toast.success("Project Code Added");
  };

  // Row Menu Actions
  const handleRowAction = (action, rowId) => {
    setActiveRowMenu(null);
    if (action === 'remove') {
      setRows(rows.filter(r => r.id !== rowId));
      toast.success("Row removed");
    } else if (action === 'clear') {
      handleHourChange(rowId, -1, "clear"); // Special flag to clear all
      toast.success("Entries cleared");
    } else if (action === 'fill') {
      const row = rows.find(r => r.id === rowId);
      if (!row) return;
      // Simple fill: copy 08h 00m to all Mon-Fri, SKIPPING FUTURE DATES
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newDaily = row.dailyHours.map((val, idx) => {
        const dayInfo = weekDays[idx];
        if (!dayInfo) return val;

        const targetDate = new Date(dayInfo.fullDate);
        targetDate.setHours(0, 0, 0, 0);

        if (targetDate > today) return val; // Skip future days

        const isWeekend = idx === 5 || idx === 6;
        return isWeekend ? "0 : 00" : "8 : 00";
      });
      const rowMinutes = newDaily.reduce((acc, val) => acc + parseDuration(val), 0);
      const updatedRow = { ...row, dailyHours: newDaily, totalHours: formatDuration(rowMinutes) };
      setRows(rows.map(r => r.id === rowId ? updatedRow : r));
      toast.success("Quick filled week");
    } else if (action === 'history') {
      toast("History feature coming soon!", { icon: '🕒' });
    }
  };

  const handleHourChange = (rowId, dayIndex, value) => {
    setIsDirty(true);
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        let newDaily;
        if (value === "clear") {
          newDaily = Array(7).fill("0 : 00");
        } else {
          newDaily = [...row.dailyHours];
          newDaily[dayIndex] = value;
        }

        // Recalculate row total immediately
        const rowMinutes = newDaily.reduce((acc, val) => acc + parseDuration(val), 0);
        return { ...row, dailyHours: newDaily, totalHours: formatDuration(rowMinutes) };
      }
      return row;
    });
    setRows(newRows);
  };

  const _handleCommentChange = (rowId, dayIndex, comment) => {
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        const newComments = [...(row.dailyComments || Array(7).fill(""))];
        newComments[dayIndex] = comment;
        return { ...row, dailyComments: newComments };
      }
      return row;
    });
    setRows(newRows);
  };

  // Popover State & Handlers (Moved to top level)
  const [editingCell, setEditingCell] = useState(null);
  const [popoverData, setPopoverData] = useState({
    hours: "",
    timeIn: "",
    timeOut: "",
    location: "India - Hyderabad",
    leaveType: "", // '' | 'WO' | 'HD' | 'FL'
    shift: "General", // 'General' | 'Second' | 'Night'
    comment: ""
  });

  const handleCellClick = (e, row, index) => {
    e.stopPropagation();

    // Prevent editing future dates
    const dayInfo = weekDays[index];
    if (dayInfo) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(dayInfo.fullDate);
      targetDate.setHours(0, 0, 0, 0);

      // Check Future (only prevent editing future dates, allow past weeks)
      if (targetDate > today) {
        toast.error("Cannot edit future dates");
        return;
      }

      // Block editing past weeks (W1/W2 etc.)
      const weekStart = new Date(weekRange.start); weekStart.setHours(0, 0, 0, 0);
      if (weekStart < earliestEditableWeekStart) {
        toast.error("This week is locked. You can only edit the current week and previous week.");
        return;
      }
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const left = rect.left;
    const top = rect.top;
    const bottom = rect.bottom;
    const width = rect.width;

    // Load Comment
    const currentComment = row.dailyComments ? row.dailyComments[index] || "" : "";

    const currentHours = row.dailyHours[index];
    let type = "";
    let hoursVal = currentHours;
    let shiftVal = "General";

    if (currentHours === "WO") { type = "WO"; hoursVal = "0 : 00"; }
    else if (currentHours === "FL") { type = "FL"; hoursVal = "0 : 00"; }
    else {
      // Parse Shift
      if (hoursVal.includes("(Second)")) shiftVal = "Second";
      else if (hoursVal.includes("(Night)")) shiftVal = "Night";

      // Clean Shift from hoursVal
      hoursVal = hoursVal.replace(" (Second)", "").replace(" (Night)", "").replace(" (General)", "");

      if (hoursVal.includes("(HD)")) { type = "HD"; hoursVal = hoursVal.replace(" (HD)", ""); }
    }

    setEditingCell({ rowId: row.id, dayIndex: index, left, top, bottom, width });
    setPopoverData({
      hours: hoursVal,
      timeIn: "",
      timeOut: "",
      location: "India - Hyderabad",
      leaveType: type,
      shift: shiftVal,
      comment: currentComment
    });
  };

  const closePopover = () => {
    setEditingCell(null);
  };

  const updateCellData = () => {
    if (!editingCell) return;

    // Validation 1: Required Fields (HD and SL usually require hours)
    if (!popoverData.hours && (popoverData.leaveType !== 'WO' && popoverData.leaveType !== 'FL')) {
      toast.error("Hours Worked is required");
      return;
    }


    const row = rows.find(r => r.id === editingCell.rowId);
    if (!row) return;

    // Validation 2: Per day max 8h
    const newMins = parseDuration(popoverData.hours);
    if (!popoverData.leaveType && newMins > 480) {
      toast.error("Per day max is 8h");
      return;
    }

    // Validation 3: Only 2 week offs a week allowed
    if (popoverData.leaveType === 'WO') {
      const otherWOs = row.dailyHours.filter((h, idx) => h === 'WO' && idx !== editingCell.dayIndex).length;
      if (otherWOs >= 2) {
        toast.error("Only 2 week offs a week is allowed");
        return;
      }
    }

    // Validation 4: Check for Half Day Leave and Full Day Leave
    const halfDayLeaveRow = rows.find(r => r.chargeCode === 'Half Day Leave');
    const fullDayLeaveRow = rows.find(r => r.chargeCode === 'Full Day Leave');
    const hasHalfDayLeave = halfDayLeaveRow && parseDuration(halfDayLeaveRow.dailyHours[editingCell.dayIndex]) > 0;
    const hasFullDayLeave = fullDayLeaveRow && parseDuration(fullDayLeaveRow.dailyHours[editingCell.dayIndex]) > 0;

    // If Full Day Leave is applied, don't allow any hours entry
    if (hasFullDayLeave && row.chargeCode !== 'Full Day Leave') {
      toast.error("Full Day Leave is applied for this day. Cannot enter hours.");
      return;
    }

    // Validation 5: Per day max 8h (or 4h if Half Day Leave) (Column Total)
    let currentDayTotalMins = 0;
    rows.forEach(r => {
      // Skip the current row being edited (we add the new value effectively)
      if (r.id === editingCell.rowId) return;

      const val = r.dailyHours[editingCell.dayIndex];
      currentDayTotalMins += parseDuration(val);
    });

    if (popoverData.leaveType !== 'WO' && popoverData.leaveType !== 'FL') {
      currentDayTotalMins += newMins;
    }

    // If Half Day Leave is applied, limit to 4 hours (240 mins)
    const maxDailyMins = hasHalfDayLeave ? 240 : 480;
    const maxDailyHours = hasHalfDayLeave ? '4 : 00' : '8 : 00';

    if (currentDayTotalMins > maxDailyMins) {
      toast.error(`Daily limit exceeded! Total: ${formatDuration(currentDayTotalMins)} / ${maxDailyHours}${hasHalfDayLeave ? ' (Half Day Leave)' : ''}`);
      return;
    }

    // Validation 5: Per week max 40h (Grand Total) - Adjusted to remove old value
    let grandTotalMins = 0;
    rows.forEach(r => {
      r.dailyHours.forEach((h, idx) => {
        if (r.id === editingCell.rowId && idx === editingCell.dayIndex) return;
        grandTotalMins += parseDuration(h);
      });
    });
    grandTotalMins += (popoverData.leaveType === 'WO' || popoverData.leaveType === 'FL' ? 0 : newMins);

    if (grandTotalMins > 2400) {
      toast.error("Per week max 40h");
      return;
    }

    let finalHours = popoverData.hours;
    if (popoverData.leaveType === 'WO') finalHours = "WO";
    else if (popoverData.leaveType === 'FL') finalHours = "FL";
    else if (popoverData.leaveType === 'HD') finalHours = `${popoverData.hours} (HD)`;

    // Append Shift if not General and not Leave (unless Leave allows shift? assuming Leave ignores shift for now, or append anyway?)
    // User requested "select shift". 
    // If working "8 : 00", and shift is "Second", append " (Second)".
    // If "WO" or "FL", shift doesn't matter much.
    // If "HD", maybe "04h 00m (HD) (Second)"?
    // Append Shift if not General and not Leave
    if (popoverData.shift && popoverData.shift !== "General" && popoverData.leaveType !== 'WO' && popoverData.leaveType !== 'FL') {
      finalHours += ` (${popoverData.shift})`;
    }

    // Single Consolidated State Update to prevent race conditions
    const newRows = rows.map(row => {
      if (row.id === editingCell.rowId) {
        // 1. Update Hours
        let newDaily = [...row.dailyHours];
        newDaily[editingCell.dayIndex] = finalHours;

        // Recalculate row total
        const rowMinutes = newDaily.reduce((acc, val) => acc + parseDuration(val), 0);

        // 2. Update Comments
        const newComments = [...(row.dailyComments || Array(7).fill(""))];
        newComments[editingCell.dayIndex] = popoverData.comment;

        return {
          ...row,
          dailyHours: newDaily,
          totalHours: formatDuration(rowMinutes),
          dailyComments: newComments
        };
      }
      return row;
    });

    setRows(newRows);
    setIsDirty(true);
    closePopover();
  };

  // Helper to build entries payload
  const buildEntries = () => {
    return rows.flatMap(row => {
      if (!Array.isArray(row.dailyHours)) return [];
      return row.dailyHours.map((hoursStr, index) => {
        if (!hoursStr || hoursStr === "0 : 00") return null;

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayName = days[index];

        const entryDate = new Date(weekRange.start);
        entryDate.setDate(entryDate.getDate() + index);

        let projectId = row.projectId || null;

        // Fallback: Try to lookup by chargeCode if projectId is missing
        if (!projectId && row.chargeCode) {
          const projectCode = row.chargeCode.split('-')[0];
          const project = availableProjects.find(p => p.projectId === projectCode);
          if (project) projectId = project._id;
        }

        let shift = "General";
        if (hoursStr.includes("(Second)")) shift = "Second";
        if (hoursStr.includes("(Night)")) shift = "Night";

        return {
          date: entryDate.toISOString(),
          day: dayName,
          hoursCompleted: hoursStr,
          totalDailyHours: hoursStr,
          chargeCode: row.chargeCode,
          projectId: projectId,
          shift: shift,
          comment: row.dailyComments ? row.dailyComments[index] : ""
        };
      }).filter(Boolean);
    });
  };

  const performSave = async () => {
    if (isLockedWeekSelected) {
      toast.error("This week is locked. You can only edit the current week and previous week.");
      return;
    }
    // Prevent saving if already submitted/approved
    if (
      rows.some(r => r.status === 'Submitted' || r.status === 'Approved') &&
      !rows.some(r => r.status === 'Changes Requested' || r.status === 'rejected-edit')
    ) {
      toast.error("Cannot modify submitted timesheets unless changes are requested.");
      return;
    }

    setIsSaving(true);
    try {
      const entries = buildEntries();

      const payload = {
        weekStartDate: weekRange.start.toISOString(),
        month: weekRange.start.toLocaleString('default', { month: 'long' }),
        empId: user?.employeeId || user?._id || "Unknown",
        name: user?.fullName || user?.username || "Unknown",
        manager: managerName,
        status: status === "Submitted" ? "Submitted" : "Saved",
        entries: entries
      };

      await axiosInstance.post('/api/timesheet/save', payload);

      setModalConfig({
        isOpen: true,
        title: "Draft Saved",
        message: "Your timesheet draft has been saved successfully.",
        type: "success",
        onConfirm: null
      });

      setRows(rows.map(r => ({ ...r, status: 'Saved' })));
      setIsDirty(false);
    } catch (error) {
      console.error("Save failed", error);
      toast.error(error.response?.data?.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    performSave();
  };

  const performSubmit = async () => {
    if (isLockedWeekSelected) {
      toast.error("This week is locked. You can only submit the current week and previous week.");
      return;
    }
    // Prevent submitting if already submitted/approved
    if (
      rows.some(r => r.status === 'Submitted' || r.status === 'Approved') &&
      !rows.some(r => r.status === 'Changes Requested' || r.status === 'rejected-edit')
    ) {
      toast.error("Timesheet is already submitted.");
      return;
    }

    setIsSubmitting(true);
    try {
      const entries = buildEntries();
      console.log("Submitting entries:", entries); // Debug

      if (entries.length === 0) {
        toast.error("Please enter at least one timesheet entry before submitting.");
        setIsSubmitting(false);
        return;
      }

      // VALIDATION: Check Daily Totals
      // Calculate total hours per day (Mon-Sun)
      const dailyTotals = Array(7).fill(0);
      const halfDayLeaveRow = rows.find(r => r.chargeCode === 'Half Day Leave');
      const fullDayLeaveRow = rows.find(r => r.chargeCode === 'Full Day Leave');

      rows.forEach(row => {
        row.dailyHours.forEach((hourStr, idx) => {
          dailyTotals[idx] += parseDuration(hourStr);
        });
      });

      // Check if any day has hours but implies incomplete day
      // If Half Day Leave is applied, max is 4 hours (240 mins)
      // Otherwise, max is 8 hours (480 mins)
      const invalidDays = [];
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      dailyTotals.forEach((mins, idx) => {
        const hasHalfDayLeave = halfDayLeaveRow && parseDuration(halfDayLeaveRow.dailyHours[idx]) > 0;
        const hasFullDayLeave = fullDayLeaveRow && parseDuration(fullDayLeaveRow.dailyHours[idx]) > 0;
        const expectedMins = hasHalfDayLeave ? 240 : 480;

        // Skip validation for days with Full Day Leave (should be 0 hours)
        if (hasFullDayLeave && mins > 0) {
          invalidDays.push(`${dayNames[idx]} (Full Day Leave applied but has ${formatDuration(mins)} hours)`);
        } else if (mins > 0 && mins !== expectedMins) {
          const hours = Math.floor(mins / 60);
          const m = mins % 60;
          invalidDays.push(`${dayNames[idx]} (${hours}:${String(m).padStart(2, '0')}) - Expected ${hasHalfDayLeave ? '4:00' : '8:00'}${hasHalfDayLeave ? ' (Half Day Leave)' : ''}`);
        }
      });

      if (invalidDays.length > 0) {
        toast.error(`Daily hours must satisfy the required hours. Please check: ${invalidDays.join(', ')}`);
        setIsSubmitting(false);
        return;
      }

      const payload = {
        weekStartDate: weekRange.start.toISOString(),
        month: weekRange.start.toLocaleString('default', { month: 'long' }),
        empId: user?.employeeId || user?._id || "Unknown",
        name: user?.fullName || user?.username || "Unknown",
        manager: managerName,
        status: "Submitted",
        entries: entries
      };

      await axiosInstance.post('/api/timesheet/submit', payload);

      setRows(rows.map(r => ({ ...r, status: 'Submitted' })));
      setIsDirty(false);

      // Show success modal
      setModalConfig({
        isOpen: true,
        title: "Submitted Successfully",
        message: "Your timesheet has been submitted to your manager for approval.",
        type: "success",
        onConfirm: null
      });

    } catch (error) {
      console.error("Submit failed", error);
      toast.error(error.response?.data?.message || "Failed to submit timesheet");
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleSubmit = async () => {
    if (!rows.length) {
      toast.error("No entries to submit");
      return;
    }

    // Show Confirmation Modal
    setModalConfig({
      isOpen: true,
      title: "Confirm Submission",
      message: "Are you sure you want to submit your timesheet? Once submitted, you cannot make changes unless returned by your manager.",
      type: "confirm",
      onConfirm: performSubmit
    });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };



  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans relative transition-colors">

      {/* Confirm/Success Modal (Reusing one component) */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        check={modalConfig.type === 'success'}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />

      {/* Alert Modal */}
      {showUnsavedAlert && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full p-6 animate-scale-in border border-transparent dark:border-gray-800 transition-colors">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <span className="font-bold text-lg">Alert!</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Changes made in the timesheet is not saved! <br />
              Are you sure to proceed without saving?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelNavigation}
                className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors"
              >
                No
              </button>
              <button
                onClick={handleConfirmNavigation}
                className="px-6 py-2 bg-[#F43F5E] text-white rounded-md hover:bg-[#e11d48] font-medium text-sm"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Notification Drawer */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-[2000] flex justify-end bg-gray-900/20 backdrop-blur-[1px]">
          {/* Click overlay to close */}
          <div className="absolute inset-0" onClick={() => setShowNotificationDrawer(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col transition-colors border-l border-transparent dark:border-gray-800">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
              <div className="flex items-center gap-3">
                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"><FiSquare className="w-5 h-5" /></button>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowNotificationMenu(!showNotificationMenu)} className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <FiMoreVertical className="w-5 h-5" />
                  </button>
                  {showNotificationMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 transition-colors">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Show Approvals</button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Show Unread</button>
                    </div>
                  )}
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full hover:text-gray-600"><FiRefreshCw className="w-4 h-4" /></button>
              <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full hover:text-gray-600"><FiSettings className="w-5 h-5" /></button>
              <button onClick={() => setShowNotificationDrawer(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full hover:text-gray-600"><FiX className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30 dark:bg-gray-900/30">
            <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-8">Getting Notifications...</h3>
            {/* Illustration placeholder */}
            <div className="relative mb-6">
              <div className="w-32 h-56 border-4 border-gray-800 rounded-[2rem] bg-white flex flex-col items-center pt-6 shadow-sm mx-auto">
                <div className="w-12 h-1 bg-gray-200 rounded-full mb-4"></div>
                <div className="w-24 h-16 bg-red-50 rounded mb-2 flex items-center gap-2 px-2">
                  <div className="w-6 h-6 bg-red-500 rounded-sm flex-shrink-0"></div>
                  <div className="flex-1 space-y-1">
                    <div className="w-full h-1 bg-gray-200 rounded"></div>
                    <div className="w-2/3 h-1 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="w-24 h-16 bg-red-50 rounded mb-2 flex items-center gap-2 px-2">
                  <div className="w-6 h-6 bg-red-500 rounded-sm flex-shrink-0"></div>
                  <div className="flex-1 space-y-1">
                    <div className="w-full h-1 bg-gray-200 rounded"></div>
                    <div className="w-2/3 h-1 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="w-24 h-16 bg-red-50 rounded flex items-center gap-2 px-2">
                  <div className="w-6 h-6 bg-red-500 rounded-sm flex-shrink-0"></div>
                  <div className="flex-1 space-y-1">
                    <div className="w-full h-1 bg-gray-200 rounded"></div>
                    <div className="w-2/3 h-1 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              {/* Person element (simple shape) */}
              <div className="absolute -right-8 bottom-0 w-20 h-32 flex flex-col items-center justify-end">
                {/* Simplified 'person' looking at phone */}
                <div className="w-8 h-8 bg-gray-300 rounded-full mb-1 relative left-[-10px]"></div> {/* Head */}
                <div className="w-10 h-16 bg-gray-300 rounded-t-lg rounded-bl-sm transform -rotate-6"></div> {/* Body */}
                <div className="flex gap-1">
                  <div className="w-3 h-8 bg-gray-800 rounded-full"></div> {/* Leg */}
                  <div className="w-3 h-8 bg-gray-800 rounded-full transform rotate-12"></div> {/* Leg */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header & Employee Summary */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-[1600px] mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {/* Breadcrumb removed */}
            </div>
            <div className="flex items-center gap-4">
              {/* Profile section removed */}
            </div>
          </div>

          {/* Employee Details Strip */}
          <div className="px-6 py-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3 pr-6 border-r border-gray-100 dark:border-gray-800 min-w-max transition-colors">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg font-bold border-2 border-white dark:border-gray-800 shadow-sm">
                  {userInitials}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">{user?.fullName || "Poojitha Bandaru"},</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user?.
                  Id || "1432"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 lg:gap-8 flex-1 justify-start pl-8">
              {/* <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Department</span>
                <span className="font-semibold text-gray-700">{user?.department || "Warehousing"}</span>
              </div> */}

              {/* <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Division</span>
                <span className="font-semibold text-gray-700 whitespace-nowrap">{user?.division || "Digital Supply Chain Management"}</span>
              </div> */}

              {/* <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">Sub Division</span>
                <span className="font-semibold text-gray-700">{user?.subDivision || "Warehousing"}</span>
              </div> */}

              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wide">Role</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{user?.role || "Digital Supply..."}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wide">Manager</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{managerName}</span>
              </div>





              {/* Notification Bell removed as requested */}
            </div>
          </div>
        </div>
      </div >
      {/* 2. Main Content Area */}
      < div className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6" >

        {/* Navigation & Controls Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-2 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <button
              onClick={() => !isPrevDisabled && attemptWeekNavigation('shift', -1)}
              className={`p-1.5 rounded-full transition-colors ${isPrevDisabled ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
              disabled={isPrevDisabled}
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 relative group">
              <div className="relative flex flex-col items-center">
                <span className="text-gray-700 dark:text-gray-200 font-bold text-lg select-none leading-none transition-colors">
                  {formatDateRange(weekRange.start, weekRange.end)}
                </span>
                {/* Global Status Display */}
                <div className="text-[10px] font-bold uppercase text-center mt-1">
                  {(() => {
                    const status = rows.length > 0 && rows[0].status ? rows[0].status : 'Draft';
                    if (status === 'Draft') return <span className="text-gray-400 dark:text-gray-600">Draft</span>;

                    let colorClass = 'text-gray-500 dark:text-gray-400';
                    if (status === 'Saved') colorClass = 'text-blue-600 dark:text-blue-400';
                    else if (status === 'Submitted') colorClass = 'text-orange-600 dark:text-orange-400';
                    else if (status === 'Approved') colorClass = 'text-green-600 dark:text-green-400';
                    else if (status === 'On Hold') colorClass = 'text-yellow-600 dark:text-yellow-400';
                    else if (status === 'Rejected') colorClass = 'text-red-600 dark:text-red-400';
                    else if (status === 'Changes Requested') colorClass = 'text-orange-600 dark:text-orange-400 font-bold';

                    return (
                      <div className="flex flex-col items-center">
                        <span className={colorClass}>{status}</span>
                        {rows.length > 0 && rows[0].rejectionReason && (status === 'Rejected' || status === 'Changes Requested') && (
                          <div className="mt-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] rounded border border-red-100 dark:border-red-800/50 max-w-[200px] truncate" title={rows[0].rejectionReason}>
                            {rows[0].rejectionReason}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <input
                  type="date"
                  value={currentDateVal}
                  onChange={handleDateChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  title="Select Date"
                />
              </div>
            </div>
            <button
              onClick={() => !isNextDisabled && attemptWeekNavigation('shift', 1)}
              className={`p-1.5 rounded-full transition-colors ${isNextDisabled ? 'text-gray-200 dark:text-gray-800 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'}`}
              disabled={isNextDisabled}
            >
              <FiChevronRight className="w-5 h-5" />
            </button>

            {/* Week Pills */}
            <div className="flex items-center gap-1 ml-4">
              {currentMonthWeeks.map((week) => {
                const isFuture = week.startDate > today;
                const isLocked = week.startDate < earliestEditableWeekStart;

                // Determine Status for this Week
                const ts = monthlyTimesheets.find(t => new Date(t.weekStartDate).toDateString() === week.startDate.toDateString());
                const status = ts ? ts.status : 'Draft';

                let statusClasses = '';
                if (isFuture || isLocked) {
                  statusClasses = 'bg-gray-50 dark:bg-gray-900/50 text-gray-300 dark:text-gray-700 border-gray-100 dark:border-gray-800 cursor-not-allowed';
                } else if (status === 'Submitted') {
                  statusClasses = 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30';
                } else if (status === 'Approved') {
                  statusClasses = 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30';
                } else if (status === 'On Hold') { // Assuming 'On Hold' string
                  statusClasses = 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
                } else if (status === 'Rejected') {
                  statusClasses = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30';
                } else {
                  // Draft / Saved
                  statusClasses = 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
                }

                // Determine active state by comparing start dates
                const isActive = weekRange.start &&
                  new Date(weekRange.start).toDateString() === week.startDate.toDateString();

                if (isActive) {
                  statusClasses = 'ring-2 ring-offset-1 dark:ring-offset-gray-900 ring-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
                }

                return (
                  <button
                    key={week.label}
                    onClick={() => !isFuture && attemptWeekNavigation('pill', week.startDate)}
                    className={`px-3 py-1 text-xs font-semibold rounded border ${statusClasses}`}
                    disabled={isFuture}
                  >
                    {week.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Instructions & Stats */}
          <div className="flex items-center gap-8 ml-auto">


            {/* Right Instructions & Stats */}
            <div className="flex items-center gap-8 ml-auto">
              {(rows.some(r => r.status === 'Submitted' || r.status === 'Approved') && !rows.some(r => r.status === 'Changes Requested' || r.status === 'rejected-edit')) ? (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${rows[0].status === 'Rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                  {rows[0].status === 'Rejected' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  )}
                  <span className="text-sm font-medium">
                    {rows[0].status === 'Approved' ? 'Timesheet Approved' :
                      rows[0].status === 'Rejected' ? 'Timesheet Rejected' :
                        'Submitted for Review'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={handleSave}
                    className={`px-5 py-2 bg-blue-600 border border-blue-600 text-white font-medium rounded-md shadow-sm transition-all transform duration-150 ${(isSaving || loading) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-105 active:scale-95'}`}
                    disabled={loading || isSaving}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : "Save"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className={`px-5 py-2 bg-[#F43F5E] text-white font-medium rounded-md shadow-sm dark:shadow-none transition-all transform duration-150 ${(isSubmitting || loading) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#e11d48] hover:scale-105 active:scale-95'}`}
                    disabled={loading || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : "Submit"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div >

        {/* 3. Timesheet Grid */}
        <div className="flex-1 overflow-auto">
          {/* Active Grid */}
          < div className="w-full" >
            {/* Grid Header */}
            < div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10 transition-colors" >
              <div className="w-[300px] p-4 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Project Code</span>
              </div>
              <div className="flex-1 grid grid-cols-8">
                {weekDays.map((day, index) => {
                  const isDayWeekOff = rows.some(r => r.dailyHours[index] === 'WO');
                  const fullDayLeaveRow = rows.find(r => r.chargeCode === 'Full Day Leave');
                  const halfDayLeaveRow = rows.find(r => r.chargeCode === 'Half Day Leave');
                  const hasFullDayLeave = fullDayLeaveRow && parseDuration(fullDayLeaveRow.dailyHours[index]) > 0;
                  const hasHalfDayLeave = halfDayLeaveRow && parseDuration(halfDayLeaveRow.dailyHours[index]) > 0;

                  // Calculate Daily Total
                  let dailyTotalMins = 0;
                  rows.forEach(r => {
                    dailyTotalMins += parseDuration(r.dailyHours[index]);
                  });
                  const dailyTotalStr = formatDuration(dailyTotalMins);
                  const maxDailyMins = hasHalfDayLeave ? 240 : 480;
                  const isOver = dailyTotalMins > maxDailyMins;
                  const _isUnder = !isDayWeekOff && !hasFullDayLeave && dailyTotalMins < maxDailyMins;
                  const isExact = dailyTotalMins === maxDailyMins;

                  return (
                    <div key={index} className={`p-2 text-center border-r border-gray-200 dark:border-gray-800 last:border-0 flex flex-col items-center justify-center transition-colors ${hasFullDayLeave ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
                      <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mb-1 transition-colors">{day.date} {day.name}</span>
                      {hasFullDayLeave ? (
                        <span className="text-xs font-bold text-gray-500">Leave</span>
                      ) : (
                        <>
                          <span className={`text-xs font-bold transition-colors ${isDayWeekOff ? 'text-gray-300 dark:text-gray-700' :
                            isOver ? 'text-red-600 dark:text-red-400' :
                              isExact ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'
                            }`}>
                            {dailyTotalStr}
                          </span>
                          {!isDayWeekOff && (
                            <span className="text-[10px] text-gray-300 dark:text-gray-600 transition-colors">/ {hasHalfDayLeave ? '4 : 00' : '8 : 00'}</span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {/* Total Column Header */}
                <div className="p-2 text-center flex flex-col items-center justify-center border-l-4 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
                  <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium uppercase mb-1 transition-colors">Total</span>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">40 : 00</span>
                </div>
              </div>
            </div >

            {/* Grid Body */}
            < div className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors" >
              {
                rows.map((row) => (
                  <div key={row.id} className="flex hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    {/* Charge Code Info */}
                    <div className="w-[300px] p-3 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col justify-center relative bg-white dark:bg-gray-900 transition-colors">


                      {/* Project Code & Menu Line */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate flex-1 transition-colors" title={row.chargeCode}>
                          {row.chargeCode || "Select Project Code"}
                        </p>

                        <div className="relative flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveRowMenu(activeRowMenu === row.id ? null : row.id); }}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <FiMoreVertical className="w-4 h-4" />
                          </button>
                          {activeRowMenu === row.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveRowMenu(null)}></div>
                              <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-100 dark:border-gray-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-200 transition-colors">
                                <button onClick={() => handleRowAction('fill', row.id)} className="w-full text-left px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                                  Quick Fill Whole Week..
                                </button>
                                {/* <button onClick={() => handleRowAction('remove', row.id)} className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                  Remove From Timesheet
                                </button> */}
                                <button onClick={() => handleRowAction('clear', row.id)} className="w-full text-left px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                                  Clear Time Entries
                                </button>
                                {/* <button onClick={() => handleRowAction('history', row.id)} className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                  History
                                </button> */}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {row.avatar && (
                        <div className="mt-1">
                          <img src={row.avatar} className="w-5 h-5 rounded-full" alt="allocator" />
                        </div>
                      )}
                    </div >

                    {/* Days Inputs */}
                    < div className="flex-1 grid grid-cols-8 bg-white dark:bg-gray-900 transition-colors" >
                      {
                        row.dailyHours.map((hours, index) => {
                          const isWeekOff = hours === 'WO';
                          const isFullDay = hours === 'FL';
                          const isHalfDay = hours.includes && hours.includes('(HD)');
                          const isSelfLearning = hours.includes && hours.includes('(SL)');

                          // Check for Full Day Leave from Full Day Leave row
                          const fullDayLeaveRow = rows.find(r => r.chargeCode === 'Full Day Leave');
                          const hasFullDayLeave = fullDayLeaveRow && parseDuration(fullDayLeaveRow.dailyHours[index]) > 0;

                          let display = hours;
                          let subText = null;
                          if (isHalfDay) {
                            // "04h 00m (HD)" -> show "4 : 00"
                            // and subtext "4h Leave" in RED
                            display = hours.replace(" (HD)", "");
                            subText = <span className="block text-[10px] text-red-500 font-bold leading-tight">4 : 00 Leave</span>;
                          } else if (isSelfLearning) {
                            display = hours.replace(" (SL)", "");
                            subText = <span className="block text-[10px] text-blue-500 font-bold leading-tight">Self Learning</span>;
                          } else if (isFullDay) {
                            display = "0 : 00";
                            subText = <span className="block text-[10px] text-red-500 font-bold leading-tight">Full Leave</span>;
                          } else if (row.chargeCode === 'Half Day Leave' && parseDuration(hours) > 0) {
                            subText = <span className="block text-[10px] text-orange-500 font-bold leading-tight">Half Day Leave</span>;
                          } else if (row.chargeCode === 'Full Day Leave' && parseDuration(hours) > 0) {
                            display = "Leave";
                            subText = <span className="block text-[10px] text-red-500 dark:text-red-400 font-bold leading-tight">Full Day Leave</span>;
                          }

                          let isFuture = false;
                          let isLockedWeek = false;
                          const dayInfo = weekDays[index];
                          if (dayInfo) {
                            const today = new Date(); today.setHours(0, 0, 0, 0);
                            const tDate = new Date(dayInfo.fullDate); tDate.setHours(0, 0, 0, 0);
                            if (tDate > today) isFuture = true;
                          }

                          if (weekRange?.start) {
                            const ws = new Date(weekRange.start); ws.setHours(0, 0, 0, 0);
                            if (ws < earliestEditableWeekStart) isLockedWeek = true;
                          }

                          // Disable if: future days, past weeks, or if Full Day Leave is applied (unless editing the Full Day Leave row itself)
                          const isDisabled = isFuture || isLockedWeek || (hasFullDayLeave && row.chargeCode !== 'Full Day Leave');

                          return (
                            <div
                              key={index}
                              className={`relative border-r border-gray-100 dark:border-gray-800 p-3 flex flex-col items-center justify-center transition-all ${isDisabled ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80'} ${isWeekOff ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''} ${hasFullDayLeave && row.chargeCode !== 'Full Day Leave' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                              onClick={(e) => !isDisabled && handleCellClick(e, row, index)}
                            >
                              <span className={`text-sm font-medium transition-colors ${isWeekOff || (hasFullDayLeave && row.chargeCode !== 'Full Day Leave') ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {display}
                              </span>
                              {subText}
                            </div>
                          );
                        })
                      }


                      {/* Row Total */}
                      < div className="border-l-4 border-gray-100 dark:border-gray-800 p-3 flex items-center justify-center bg-white dark:bg-gray-900 transition-colors" >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 transition-colors">{row.totalHours}</span>
                      </div >
                    </div >
                  </div >
                ))
              }

              {/* Inline Add Row Form */}
              {
                showAddRowForm && (
                  <div className="flex border-b border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-[300px] p-4 border-r border-gray-200 dark:border-gray-800 bg-red-50/30 dark:bg-red-900/10 transition-colors">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Select Project Code</label>
                      <select
                        className="w-full text-sm border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                        autoFocus
                        value={selectedProjectCode}
                        onChange={(e) => setSelectedProjectCode(e.target.value)}
                      >
                        <option value="">Select...</option>
                        {availableProjects.map((project) => (
                          <option key={project._id || project.projectId} value={project.projectId}>
                            {project.projectId} - {project.projectName}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-3">
                        <button onClick={confirmAddRow} className="px-3 py-1 bg-[#F43F5E] text-white text-xs rounded shadow-sm hover:bg-[#e11d48]">Add</button>
                        <button onClick={() => setShowAddRowForm(false)} className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                      </div>
                    </div>
                    <div className="flex-1 bg-gray-50/10"></div>
                  </div>
                )}

              {/* Add Charge Code Button Area (Only visible when has rows) */}
              {/* < div className="p-4 border-b border-gray-100 bg-white" >
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-2 text-[#F43F5E] border border-[#F43F5E] bg-[#FFF1F2] px-4 py-2 rounded hover:bg-[#FFE4E6] transition-colors text-sm font-bold"
                >
                  <FiPlus /> Add
                </button>
              </div > */}
            </div >
          </div >
        </div >
      </div >



      {/* Popover Render */}
      {
        editingCell && (() => {
          const POPOVER_WIDTH = 500;
          const POPOVER_HEIGHT = 450;
          const spaceBelow = window.innerHeight - editingCell.bottom;
          const showAbove = spaceBelow < POPOVER_HEIGHT;

          // Align Center
          const cellCenter = editingCell.left + (editingCell.width / 2);
          let popLeft = cellCenter - (POPOVER_WIDTH / 2);
          // Clamp
          const MARGIN = 10;
          popLeft = Math.max(MARGIN, Math.min(popLeft, window.innerWidth - POPOVER_WIDTH - MARGIN));

          // Arrow Position
          const arrowLeft = cellCenter - popLeft - 8; // 8 is half of w-4 (16px)

          return (
            <>
              <div
                className="fixed inset-0 z-[100] cursor-default"
                onClick={closePopover} // Click outside to close
              />
              <div
                className="fixed z-[101] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-[500px] p-3 text-left animate-in fade-in zoom-in-95 duration-200 transition-colors"
                style={{
                  top: showAbove ? editingCell.top - 10 : editingCell.bottom + 5,
                  left: popLeft,
                  transform: showAbove ? 'translateY(-100%)' : 'none'
                }}
              >
                {/* Arrow */}
                <div
                  className={`absolute w-4 h-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transform rotate-45 transition-colors ${showAbove ? '-bottom-2 border-b border-r' : '-top-2 border-t border-l'}`}
                  style={{ left: arrowLeft }}
                />

                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">{weekDays[editingCell.dayIndex]?.date} {weekDays[editingCell.dayIndex]?.name} 2026</span>
                    <div className="flex items-center gap-2">

                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px] transition-colors" title={rows.find(r => r.id === editingCell.rowId)?.chargeCode}>{rows.find(r => r.id === editingCell.rowId)?.chargeCode}</span>
                      <button onClick={closePopover} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><FiX className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">Hours Worked *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={popoverData.hours}
                        onChange={(e) => setPopoverData({ ...popoverData, hours: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        className="w-full text-sm font-semibold border border-red-300 dark:border-red-900/50 rounded p-1.5 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 transition-colors"
                        placeholder="0 : 00"
                        disabled={popoverData.leaveType === 'WO' || popoverData.leaveType === 'FL'}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">Shift</label>
                    <select
                      value={popoverData.shift}
                      onChange={(e) => setPopoverData({ ...popoverData, shift: e.target.value })}
                      className="w-full text-xs border border-gray-300 dark:border-gray-700 rounded p-1.5 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 transition-colors"
                      disabled={popoverData.leaveType === 'WO' || popoverData.leaveType === 'FL'}
                    >
                      <option value="General">General</option>
                      <option value="Second">Second</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-700 text-[#F43F5E] focus:ring-[#F43F5E] bg-white dark:bg-gray-800 transition-colors"
                        checked={popoverData.leaveType === 'WO'}
                        onChange={(e) => setPopoverData({ ...popoverData, leaveType: e.target.checked ? 'WO' : '', hours: e.target.checked ? "0 : 00" : "8 : 00" })}
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap transition-colors">Week Off</span>
                    </label>
                  </div>

                  <div className="mb-3">
                    <textarea
                      className="w-full h-10 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-300 dark:focus:border-gray-600 placeholder-gray-400 dark:placeholder-gray-600 resize-none transition-colors"
                      placeholder="Enter comments here"
                      value={popoverData.comment}
                      onChange={(e) => setPopoverData({ ...popoverData, comment: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button onClick={closePopover} className="px-4 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Clear
                    </button>
                    <button onClick={updateCellData} className="px-4 py-1.5 bg-[#F43F5E] text-white rounded text-sm font-semibold hover:bg-[#e11d48] shadow-sm">
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()
      }
    </div >
  );
};

export default Timesheet;
