import React, { useState, useEffect } from "react";
import { X, Save, Loader2, ChevronDown } from "lucide-react";
import { courseService, teacherService } from "../../api";

/**
 * Modal for editing curriculum details for a specific class
 */
const CurriculumModal = ({ classData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    className: "",
    branch: "",
    semester: "",
    type: "Full Time",
    courses: [],
  });
  
  const [courseOptions, setCourseOptions] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCourseIdx, setExpandedCourseIdx] = useState(null);
  const [teacherSearch, setTeacherSearch] = useState("");

  useEffect(() => {
    loadOptions();
    if (classData) {
      setFormData({
        className: classData.className || "",
        branch: classData.branch || "",
        semester: classData.semester || "",
        type: classData.type || "Full Time",
        courses: classData.courses || [],
      });
    }
  }, [classData]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const [courses, teachers] = await Promise.all([
        courseService.listCourses(),
        teacherService.listTeachers(),
      ]);
      setCourseOptions(courses);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error("Error loading options:", error);
      alert("Failed to load course and teacher data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTeacherSelect = (courseIndex, teacherId) => {
    setFormData((prev) => {
      const newCourses = [...prev.courses];
      const currentTeachers = newCourses[courseIndex].teacherIds || [];
      
      // Check if teacher is already selected (handle both exact match and string comparison)
      const isAlreadySelected = currentTeachers.some(id => 
        id === teacherId || String(id) === String(teacherId)
      );
      
      // Toggle teacher selection
      if (isAlreadySelected) {
        newCourses[courseIndex] = {
          ...newCourses[courseIndex],
          teacherIds: currentTeachers.filter((id) => 
            id !== teacherId && String(id) !== String(teacherId)
          ),
        };
      } else {
        newCourses[courseIndex] = {
          ...newCourses[courseIndex],
          teacherIds: [...currentTeachers, teacherId],
        };
      }
      
      return { ...prev, courses: newCourses };
    });
  };

  const handleSave = async () => {
    const { className, branch, semester, type, courses } = formData;

    if (!className.trim() || !branch.trim() || !semester.trim()) {
      alert("Please fill in Class Name, Branch, and Semester");
      return;
    }

    // Filter out courses with no teachers selected
    const validCourses = courses.filter(
      (c) => c.teacherIds && c.teacherIds.length > 0
    );

    if (validCourses.length === 0) {
      alert("Please assign at least one teacher to a course");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        courses: validCourses,
      });
      onClose();
    } catch (error) {
      console.error("Error saving curriculum:", error);
      alert("Failed to save curriculum. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getCourseName = (courseId) => {
    const course = courseOptions.find((c) => {
      // Try exact match first
      if (c.unid === courseId) return true;
      // Try with string comparison
      if (String(c.unid) === String(courseId)) return true;
      // Try with code field
      if (c.code === courseId || String(c.code) === String(courseId)) return true;
      return false;
    });
    
    if (course) {
      // Display code and name if available
      const code = course.code || course.ID;
      return course.name ? `${code} - ${course.name}` : code;
    }
    
    return courseId;
  };

  const getTeacherName = (teacherId) => {
    const teacher = teacherOptions.find((t) => {
      if (t.ID === teacherId) return true;
      if (String(t.ID) === String(teacherId)) return true;
      return false;
    });
    
    if (teacher) {
      return teacher.name ? `${teacher.ID} - ${teacher.name}` : teacher.ID;
    }
    
    return teacherId;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Edit Curriculum
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Class Information */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) => handleInputChange("className", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., B.Tech"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch *
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => handleInputChange("branch", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester *
              </label>
              <input
                type="text"
                value={formData.semester}
                onChange={(e) => handleInputChange("semester", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1, 2, 3..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
              </select>
            </div>
          </div>

          {/* Courses and Teachers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Courses & Teachers
            </h3>

            {formData.courses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No courses found for this class
              </div>
            ) : (
              <div className="space-y-2">
                {formData.courses.map((course, index) => {
                  const isExpanded = expandedCourseIdx === index;
                  const filteredTeachers = teacherOptions.filter(t => {
                    if (!teacherSearch) return true;
                    const s = teacherSearch.toLowerCase();
                    return (t.name || '').toLowerCase().includes(s) || (t.ID || '').toLowerCase().includes(s);
                  });
                  return (
                  <div key={index} className={`rounded-lg border transition-all ${isExpanded ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}>
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => { setExpandedCourseIdx(isExpanded ? null : index); setTeacherSearch(''); }}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <span className="font-medium text-gray-900">{getCourseName(course.courseId)}</span>
                        {(course.teacherIds || []).length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{course.teacherIds.length} teacher(s)</span>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-gray-200">
                        <input
                          type="text"
                          placeholder="Search teachers..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="w-full px-3 py-1.5 mt-2 mb-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                          {filteredTeachers.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500">No teachers found</div>
                          ) : (
                            filteredTeachers.map((teacher) => {
                              const isSelected = (course.teacherIds || []).some(tid => {
                                const tidStr = String(tid);
                                return tidStr === String(teacher.ID || '') || tidStr === String(teacher.unid || '');
                              });
                              return (
                                <label
                                  key={teacher.ID || teacher.unid}
                                  className={`flex items-center px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleTeacherSelect(index, teacher.unid || teacher.ID)}
                                    className="mr-2 h-3.5 w-3.5 text-blue-600 rounded"
                                  />
                                  <span>{getTeacherName(teacher.ID)}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Curriculum
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurriculumModal;
