import React, { useState, useEffect } from "react";
import { Plus, X, List, Grid, Save, Trash2, Search, BookOpen, Users, Loader2, Check, Download, Pencil, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { courseService, teacherService, curriculumService, settingsService, timetableService, scheduleService } from "../api";
import { semesterThenAlpha } from "../utils/sortHelpers";
import CurriculumModal from "../components/timetableManagment/CurriculumModal";


const Curriculum = () => {
  const [viewMode, setViewMode] = useState("cards");
  const [curriculum, setCurriculum] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state for new curriculum
  const [newCurriculum, setNewCurriculum] = useState({
    className: "",
    branch: "",
    semester: "",
    type: "",
    totalCreditsInput: "",
    courses: []
  });

  const [isCreating, setIsCreating] = useState(false);

  // Settings-driven dropdowns
  const [programs, setPrograms] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const semesterOptions = ["1","2","3","4","5","6","7","8"];

  // Extract from timetables state
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [selectedExtracted, setSelectedExtracted] = useState(null);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");

  useEffect(() => {
    fetchCurriculum();
    fetchAllCourses();
    fetchAllTeachers();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getAllSettings();
      setPrograms(settings.programs || []);
      setAllBranches(settings.branches || []);
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const fetchCurriculum = async () => {
    try {
      // Fetch from new curriculums collection
      const curriculums = await curriculumService.listCurriculums();
      setCurriculum(curriculums);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const courses = await courseService.listCourses({});
      setAvailableCourses(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchAllTeachers = async () => {
    try {
      const teachers = await teacherService.listTeachers();
      setAvailableTeachers(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const generateCurriculumId = (className, branch, semester, type) => {
    return `curr_${className}_${branch}_${semester}_${type}`.toLowerCase().replace(/\s+/g, "_");
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setShowExtracted(false);
    setSelectedCurriculum(null);
    setNewCurriculum({
      className: "",
      branch: "",
      semester: "",
      type: "",
      totalCreditsInput: "",
      courses: []
    });
  };

  // ── Extract from Timetables ─────────────────────────────────────────────
  const handleExtractFromTimetables = async () => {
    try {
      setExtracting(true);
      setIsCreating(false);
      const timetables = await timetableService.listTimetables();
      if (!timetables.length) { alert("No timetables found."); setExtracting(false); return; }

      const allSchedules = [];
      for (const tt of timetables) {
        const schedules = await scheduleService.getSchedulesByTimetableId(tt.timetableId);
        schedules.forEach(s => { s.semester = tt.semester; });
        allSchedules.push(...schedules);
      }

      // Group schedules by class/branch/semester/type
      const groupMap = new Map();
      for (const s of allSchedules) {
        if (!s.class && !s.branch) continue;
        const key = `${s.class||''}|${s.branch||''}|${s.semester||''}|${s.type||''}`;
        if (!groupMap.has(key)) groupMap.set(key, { classKey: key, className: s.class||'', branch: s.branch||'', semester: s.semester||'', type: s.type||'', courseMap: new Map() });
        const g = groupMap.get(key);
        if (s.courseId) {
          if (!g.courseMap.has(String(s.courseId))) g.courseMap.set(String(s.courseId), new Set());
          if (s.teacherId) g.courseMap.get(String(s.courseId)).add(String(s.teacherId));
        }
      }

      const extracted = Array.from(groupMap.values()).map(g => ({
        ...g,
        courses: Array.from(g.courseMap.entries()).map(([courseId, tids]) => ({ courseId, teacherIds: Array.from(tids) })),
        isSaved: false,
      }));

      // Mark already-saved ones
      const existingIds = new Set(curriculum.map(c => c.curriculumId));
      extracted.forEach(e => {
        e.isSaved = existingIds.has(generateCurriculumId(e.className, e.branch, e.semester, e.type));
      });

      extracted.sort(semesterThenAlpha);
      setExtractedClasses(extracted);
      setShowExtracted(true);
    } catch (err) {
      console.error("Extract error:", err);
      alert("Failed to extract curriculum data.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtracted = async (data) => {
    const id = generateCurriculumId(data.className, data.branch, data.semester, data.type);
    await curriculumService.saveCurriculum(id, data.courses || [], { className: data.className, branch: data.branch, semester: data.semester, type: data.type });
    setExtractedClasses(prev => prev.map(c => c.classKey === data.classKey ? { ...c, isSaved: true } : c));
    fetchCurriculum();
    alert("Curriculum saved!");
  };

  const handleSaveAllExtracted = async () => {
    const unsaved = extractedClasses.filter(c => !c.isSaved);
    if (!unsaved.length) { alert("All already saved!"); return; }
    if (!window.confirm(`Save ${unsaved.length} curriculum(s)?`)) return;
    setSavingAll(true);
    let ok = 0, fail = 0;
    for (const e of unsaved) {
      try {
        const id = generateCurriculumId(e.className, e.branch, e.semester, e.type);
        await curriculumService.saveCurriculum(id, e.courses, { className: e.className, branch: e.branch, semester: e.semester, type: e.type });
        setExtractedClasses(prev => prev.map(c => c.classKey === e.classKey ? { ...c, isSaved: true } : c));
        ok++;
      } catch { fail++; }
    }
    setSavingAll(false);
    fetchCurriculum();
    alert(`Saved ${ok} curriculum(s).${fail ? ` ${fail} failed.` : ''}`);
  };

  const handleSaveCurriculum = async () => {
    const { className, branch, semester, type, courses, totalCreditsInput } = newCurriculum;
    
    if (!className.trim() || !branch.trim() || !semester.trim() || !type.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!totalCreditsInput || totalCreditsInput.trim() === "") {
      alert("Please enter total credits");
      return;
    }

    const inputCredits = parseFloat(totalCreditsInput);
    const calculatedCredits = calculateTotalCredits(courses);

    if (isNaN(inputCredits) || inputCredits <= 0) {
      alert("Please enter a valid positive number for total credits");
      return;
    }

    if (inputCredits !== calculatedCredits) {
      const confirmed = confirm(
        `Warning: Total credits mismatch!\n\nEntered: ${inputCredits}\nCalculated from courses: ${calculatedCredits}\n\nDo you want to save anyway?`
      );
      if (!confirmed) return;
    }

    try {
      const curriculumId = generateCurriculumId(className, branch, semester, type);
      const curriculumData = {
        className,
        branch,
        semester,
        type,
        courses,
        totalCredits: calculatedCredits,
        expectedCredits: inputCredits,
        updatedAt: new Date().toISOString()
      };

      await curriculumService.saveCurriculum(
        curriculumId,
        courses,
        { className, branch, semester, type }
      );
      
      setIsCreating(false);
      setNewCurriculum({
        className: "",
        branch: "",
        semester: "",
        type: "",
        totalCreditsInputster: "",
        courses: []
      });
      
      fetchCurriculum();
      alert("Curriculum saved successfully!");
    } catch (error) {
      console.error("Error saving curriculum:", error);
      alert("Failed to save curriculum");
    }
  };

  const handleDeleteCurriculum = async (curriculumId) => {
    if (!confirm("Are you sure you want to delete this curriculum?")) return;

    try {
      await curriculumService.deleteCurriculum(curriculumId);
      fetchCurriculum();
      alert("Curriculum deleted successfully!");
    } catch (error) {
      console.error("Error deleting curriculum:", error);
      alert("Failed to delete curriculum");
    }
  };

  // Open CurriculumModal for editing a saved curriculum
  const handleEditSavedCurriculum = (curr) => {
    setEditingCurriculum({
      classKey: curr.curriculumId,
      className: curr.class || curr.className,
      branch: curr.branch,
      semester: curr.semester,
      type: curr.type,
      courses: curr.courses || [],
    });
  };

  const handleSaveEditedCurriculum = async (data) => {
    const id = generateCurriculumId(data.className, data.branch, data.semester, data.type);
    await curriculumService.saveCurriculum(id, data.courses || [], { className: data.className, branch: data.branch, semester: data.semester, type: data.type });
    setEditingCurriculum(null);
    fetchCurriculum();
    alert("Curriculum updated!");
  };

  // Toggle teacher on a selected course in create form
  const handleToggleTeacher = (courseUnid, teacherId) => {
    setNewCurriculum(prev => ({
      ...prev,
      courses: prev.courses.map(c => {
        if (c.unid !== courseUnid) return c;
        const tids = c.teacherIds || [];
        const has = tids.includes(teacherId);
        return { ...c, teacherIds: has ? tids.filter(t => t !== teacherId) : [...tids, teacherId] };
      })
    }));
  };

  const getCourseName = (courseId) => {
    const course = availableCourses.find((c) => {
      if (c.ID === courseId || String(c.ID) === String(courseId)) return true;
      if (c.unid === courseId || String(c.unid) === String(courseId)) return true;
      if (c.code === courseId || String(c.code) === String(courseId)) return true;
      return false;
    });
    
    if (course) {
      const code = course.code || course.ID;
      return course.name ? `${code} - ${course.name}` : code;
    }
    
    return courseId;
  };

  const getTeacherName = (teacherId) => {
    const teacher = availableTeachers.find((t) => {
      if (t.ID === teacherId || String(t.ID) === String(teacherId)) return true;
      if (t.unid === teacherId || String(t.unid) === String(teacherId)) return true;
      return false;
    });
    
    if (teacher) {
      return teacher.name ? `${teacher.ID} - ${teacher.name}` : teacher.ID;
    }
    
    return teacherId;
  };

  const handleEditCurriculum = (curriculum) => {
    setNewCurriculum({
      className: curriculum.className,
      branch: curriculum.branch,
      semester: curriculum.semester,
      type: curriculum.type,
      courses: curriculum.courses || []
    });
    setIsCreating(true);
    setSelectedCurriculum(curriculum.id);
  };

  const toggleCourseSelection = (course) => {
    const isSelected = newCurriculum.courses.some(c => c.unid === course.unid);
    
    if (isSelected) {
      setNewCurriculum({
        ...newCurriculum,
        courses: newCurriculum.courses.filter(c => c.unid !== course.unid)
      });
    } else {
      setNewCurriculum({
        ...newCurriculum,
        courses: [...newCurriculum.courses, {
          unid: course.unid,
          name: course.name,
          code: course.code,
          credits: course.credits
        }]
      });
    }
  };

  const calculateTotalCredits = (courses) => {
    return courses.reduce((total, course) => {
      const credits = parseFloat(course.credits) || 0;
      return total + credits;
    }, 0);
  };

  const filteredCourses = availableCourses.filter(course => {
    const search = searchTerm.toLowerCase();
    return (
      course.name?.toLowerCase().includes(search) ||
      course.code?.toLowerCase().includes(search) ||
      course.ID?.toLowerCase().includes(search)
    );
  });

  const filteredCurriculum = curriculum.filter(curr => {
    const search = searchTerm.toLowerCase();
    return (
      curr.class?.toLowerCase().includes(search) ||
      curr.branch?.toLowerCase().includes(search) ||
      curr.semester?.toLowerCase().includes(search) ||
      curr.type?.toLowerCase().includes(search)
    );
  }).sort(semesterThenAlpha);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-6 h-6 text-gray-700" />
                <h1 className="text-2xl font-semibold text-gray-900">Curriculum Management</h1>
              </div>
              <p className="text-sm text-gray-600">Assign courses and teachers to classes</p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-2 rounded-l-lg transition-colors cursor-pointer ${
                    viewMode === "cards" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-r-lg transition-colors cursor-pointer ${
                    viewMode === "list" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <List size={20} />
                </button>
              </div>
              
              <button
                onClick={handleExtractFromTimetables}
                disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {extracting ? 'Extracting...' : 'Extract from Timetables'}
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Create New
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {!isCreating && (
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search curriculum by class, branch, or semester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedCurriculum ? "Edit Curriculum" : "Create New Curriculum"}
              </h2>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cascading Dropdown Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* 1. Program */}
              <select
                value={newCurriculum.className}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, className: e.target.value, branch: "", semester: "", type: "" })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="">Select Program</option>
                {programs.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {/* 2. Branch — filtered by selected program */}
              <select
                value={newCurriculum.branch}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, branch: e.target.value, semester: "", type: "" })}
                disabled={!newCurriculum.className}
                className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !newCurriculum.className ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
                }`}
              >
                <option value="">{!newCurriculum.className ? "— Select Program first —" : "Select Branch/Batch"}</option>
                {(allBranches || []).filter(b => !b.programs || b.programs.length === 0 || b.programs.includes(newCurriculum.className)).map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              {/* 3. Semester — locked until branch is chosen */}
              <select
                value={newCurriculum.semester}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, semester: e.target.value, type: "" })}
                disabled={!newCurriculum.branch}
                className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !newCurriculum.branch ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
                }`}
              >
                <option value="">{!newCurriculum.branch ? "— Select Branch first —" : "Select Semester"}</option>
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {/* 4. Type — locked until semester is chosen */}
              <select
                value={newCurriculum.type}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, type: e.target.value })}
                disabled={!newCurriculum.semester}
                className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !newCurriculum.semester ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
                }`}
              >
                <option value="">{!newCurriculum.semester ? "— Select Semester first —" : "Select Type"}</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
              </select>
              <input
                type="number"
                step="0.5"
                placeholder="Total Credits"
                value={newCurriculum.totalCreditsInput}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, totalCreditsInput: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>

            {/* Credits Comparison */}
            {newCurriculum.totalCreditsInput && (
              <div className="mb-6 p-3 rounded-lg border">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-600">Expected Credits: </span>
                    <span className="font-semibold">{parseFloat(newCurriculum.totalCreditsInput) || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Course Credits: </span>
                    <span className={`font-semibold ${
                      parseFloat(newCurriculum.totalCreditsInput) === calculateTotalCredits(newCurriculum.courses)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {calculateTotalCredits(newCurriculum.courses)}
                    </span>
                  </div>
                  <div>
                    {parseFloat(newCurriculum.totalCreditsInput) === calculateTotalCredits(newCurriculum.courses) ? (
                      <span className="text-green-600 text-sm font-medium">Match</span>
                    ) : (
                      <span className="text-red-600 text-sm font-medium">
                        Mismatch ({(calculateTotalCredits(newCurriculum.courses) - parseFloat(newCurriculum.totalCreditsInput)).toFixed(1)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Courses */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Selected Courses</h3>
                <div className="text-sm">
                  <span className="text-gray-600">Course Credits: </span>
                  <span className="font-semibold text-blue-600">
                    {calculateTotalCredits(newCurriculum.courses)}
                  </span>
                </div>
              </div>

              {newCurriculum.courses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">No courses selected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newCurriculum.courses.map((course) => {
                    const isExpanded = expandedCourseId === course.unid;
                    return (
                    <div
                      key={course.unid}
                      className={`rounded-lg border transition-all ${isExpanded ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer"
                        onClick={() => { setExpandedCourseId(isExpanded ? null : course.unid); setTeacherSearchTerm(''); }}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          <span className="font-medium text-gray-900">{course.name}</span>
                          <span className="text-gray-500">({course.code})</span>
                          <span className="text-sm text-gray-500">{course.credits} Cr</span>
                          {(course.teacherIds || []).length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{course.teacherIds.length} teacher(s)</span>
                          )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCourseSelection(course); }} className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-gray-200">
                          <input
                            type="text"
                            placeholder="Search teachers..."
                            value={teacherSearchTerm}
                            onChange={(e) => setTeacherSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 mt-2 mb-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                            {availableTeachers
                              .filter(t => {
                                if (!teacherSearchTerm) return true;
                                const s = teacherSearchTerm.toLowerCase();
                                return (t.name || '').toLowerCase().includes(s) || (t.ID || '').toLowerCase().includes(s);
                              })
                              .map(t => {
                                const tid = t.unid || t.ID;
                                const isSelected = (course.teacherIds || []).includes(tid);
                                return (
                                  <label key={tid} className={`flex items-center px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => handleToggleTeacher(course.unid, tid)}
                                      className="mr-2 h-3.5 w-3.5 text-blue-600 rounded" />
                                    <span>{t.ID} {t.name ? `- ${t.name}` : ''}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setShowCourseSelector(true)}
                className="mt-4 w-full py-2 text-sm border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                + Add Courses
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveCurriculum}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Save size={20} />
              Save Curriculum
            </button>
          </div>
        )}

        {/* Extracted from Timetables Results */}
        {showExtracted && !isCreating && extractedClasses.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Extracted from Timetables</h2>
                <p className="text-sm text-gray-600">{extractedClasses.length} class(es) found — click to edit before saving</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveAllExtracted} disabled={savingAll || extractedClasses.every(c => c.isSaved)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed">
                  {savingAll ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingAll ? 'Saving...' : 'Save All'}
                </button>
                <button onClick={() => setShowExtracted(false)} className="px-3 py-2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extractedClasses.map(e => (
                <div key={e.classKey} onClick={() => { setSelectedExtracted(e); setShowExtractModal(true); }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer relative">
                  {e.isSaved && (
                    <div className="absolute top-3 right-3 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Check size={12} /> Saved
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 text-lg">{e.className}</h3>
                  <p className="text-sm text-gray-600">{e.branch}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span>Sem: {e.semester}</span>
                    <span>Type: {e.type}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm font-medium text-gray-700">
                    {e.courses.length} Course{e.courses.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showExtractModal && selectedExtracted && (
          <CurriculumModal
            classData={selectedExtracted}
            onClose={() => { setShowExtractModal(false); setSelectedExtracted(null); }}
            onSave={handleSaveExtracted}
          />
        )}

        {/* Curriculum Display */}
        {!isCreating && (
          <>
            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCurriculum.map((curriculum) => (
                  <div
                    key={curriculum.curriculumId}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {curriculum.class}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {curriculum.branch} - Sem {curriculum.semester}
                        </p>
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {curriculum.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditSavedCurriculum(curriculum); }}
                          className="text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCurriculum(curriculum.curriculumId)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-700">Courses</span>
                        <span className="text-sm text-gray-600">
                          {curriculum.courses?.length || 0} courses
                        </span>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {curriculum.courses?.map((course, idx) => (
                          <div
                            key={idx}
                            className="text-sm p-3 bg-gray-50 rounded border border-gray-100"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 break-words">
                                  {getCourseName(course.courseId)}
                                </div>
                              </div>
                            </div>
                            {course.teacherIds && course.teacherIds.length > 0 && (
                              <div className="flex items-start gap-2 mt-2 pl-6">
                                <Users className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-gray-600 break-words">
                                  {course.teacherIds.map(tid => getTeacherName(tid)).join(", ")}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!curriculum.courses || curriculum.courses.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">No courses assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Courses</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCurriculum.map((curriculum) => (
                      <tr key={curriculum.curriculumId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{curriculum.class}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{curriculum.branch}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{curriculum.semester}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {curriculum.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {curriculum.courses?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-right flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditSavedCurriculum(curriculum)}
                            className="text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCurriculum(curriculum.curriculumId)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCurriculum.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No curriculum found
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Course Selector Modal */}
      {showCourseSelector && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Courses</h3>
              <button
                onClick={() => setShowCourseSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                {filteredCourses.map((course) => {
                  const isSelected = newCurriculum.courses.some(c => c.unid === course.unid);
                  
                  return (
                    <div
                      key={course.unid}
                      onClick={() => toggleCourseSelection(course)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{course.name}</div>
                          <div className="text-sm text-gray-500">
                            {course.code} - {course.credits} Credits
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {course.department} - Sem {course.semester}
                          </div>
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredCourses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No courses found
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {newCurriculum.courses.length} courses selected - 
                <span className="font-semibold text-blue-600 ml-1">
                  {calculateTotalCredits(newCurriculum.courses)} Credits
                </span>
              </div>
              <button
                onClick={() => {
                  setShowCourseSelector(false);
                  setSearchTerm("");
                }}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Saved Curriculum Modal */}
      {editingCurriculum && (
        <CurriculumModal
          classData={editingCurriculum}
          onClose={() => setEditingCurriculum(null)}
          onSave={handleSaveEditedCurriculum}
        />
      )}

      <Footer />
    </div>
  );
};

export default Curriculum;
