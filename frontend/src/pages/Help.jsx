import React, { useState } from "react";
import useAuthStore from "../store/authStore";
import { ChevronDown, HelpCircle } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Help = () => {
  const [expandedSections, setExpandedSections] = useState({
    admin_overview: true,
  });

  const user = useAuthStore((s) => s.user);
  const getEffectiveRole = useAuthStore((s) => s.getEffectiveRole);
  const effectiveRole = getEffectiveRole();

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const HelpSection = ({ id, title, children }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        className="w-full bg-gray-100 hover:bg-gray-200 px-5 py-4 flex justify-between items-center transition-colors duration-200"
        onClick={() => toggleSection(id)}
      >
        <span className="font-semibold text-gray-900 text-left">{title}</span>
        <ChevronDown
          size={20}
          className={`text-gray-600 flex-shrink-0 transition-transform duration-500 ${
            expandedSections[id] ? "transform rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          expandedSections[id] ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 py-4 bg-white text-gray-700">{children}</div>
      </div>
    </div>
  );

  const renderAdminHelp = () => (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Help & User Manual</h1>
        </div>
        <p className="text-sm text-gray-600">Admin - Complete Guide</p>
      </div>

      <HelpSection id="admin_overview" title="Getting Started - Admin Overview">
        <div className="space-y-4">
          <p className="text-gray-700">
            As an Admin, you have access to all features in Planovate. This guide will walk you through the complete workflow for setting up your timetable system.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Key Steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Upload Staff Data (Teacher Load)</li>
              <li>Manage Courses (Course Load)</li>
              <li>Setup Rooms (Room Load)</li>
              <li>Configure Curriculum & Assign Teachers</li>
              <li>Create & Publish Timetable</li>
            </ol>
          </div>
          <p className="text-sm font-semibold text-blue-700 bg-blue-50 p-3 rounded">Follow these steps in order for the best experience.</p>
        </div>
      </HelpSection>

      <HelpSection id="step1_teacher" title="Step 1: Upload Staff Data - Teacher Load">
        <div className="space-y-4">
          <p className="text-gray-700">
            The first step in setting up your timetable system is to upload your staff/teacher information.
          </p>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/teacher-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Staff"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Workflow:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>Select/Create Faculty:</strong> From the dropdown menu, select an existing faculty or create a new one if needed.
              </li>
              <li>
                <strong>Select/Create Department:</strong> After selecting faculty, select a department from the dropdown or create a new department.
              </li>
              <li>
                <strong>View Teachers Table:</strong> Once you've selected both faculty and department, a complete table of teachers will appear.
              </li>
              <li>
                <strong>Add Teachers:</strong> Click the <strong>"Add Teacher"</strong> button.
              </li>
              <li>
                <strong>Fill Teacher Information:</strong> Enter the required information:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-700">
                  <li>Teacher Name</li>
                  <li>Employee ID (Optional)</li>
                  <li>Email Address</li>
                  <li>Other relevant details</li>
                </ul>
              </li>
              <li>
                <strong>Save Teacher:</strong> You have two options:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-700">
                  <li><strong>"Save & Close"</strong> - Save this teacher and close the form (use if adding only one teacher)</li>
                  <li><strong>"Save & Add More"</strong> - Save this teacher and add another one immediately (use if adding multiple teachers)</li>
                </ul>
              </li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Search & Verify:</h4>
            <p className="text-gray-700">
              After adding teachers, you can verify them by using the <strong>Search Bar</strong> at the top of the teachers table. Simply type the teacher's name or ID to find them.
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm text-blue-900"><strong>💡 Tip:</strong> Make sure all teacher information is accurate before moving to the next step, as this data will be used throughout the system.</p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="step2_course" title="Step 2: Course Management - Course Load">
        <div className="space-y-4">
          <p className="text-gray-700">
            After adding teachers, the next step is to manage courses for each department and semester.
          </p>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/course-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Courses"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Workflow:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li><strong>Select Faculty:</strong> Choose a faculty from the dropdown menu.</li>
              <li><strong>Select Department:</strong> Choose a department from the dropdown menu.</li>
              <li><strong>Select Semester:</strong> Select the semester for which you want to add courses.</li>
              <li><strong>View Courses List:</strong> The complete list of courses for that faculty, department, and semester will be displayed in a table.</li>
              <li>
                <strong>Add or Update Courses:</strong> You can:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-700">
                  <li><strong>Add New Course:</strong> Click the "Add Course" button and fill in course details (course code, name, credits, etc.)</li>
                  <li><strong>Update Existing Course:</strong> Click the "Edit" button on any course row to modify its information</li>
                  <li><strong>Delete Course:</strong> Click the "Delete" button to remove a course</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm text-blue-900"><strong>💡 Tip:</strong> You'll assign teachers to courses in the Curriculum section. You can assign teachers here too, but it's more convenient to do it in the Curriculum page.</p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="step3_room" title="Step 3: Room Management - Room Load">
        <div className="space-y-4">
          <p className="text-gray-700">
            Set up your physical rooms and manage their availability across different time slots.
          </p>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/room-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Rooms"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Workflow:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li><strong>Select Faculty:</strong> Choose a faculty from the dropdown menu.</li>
              <li><strong>View Rooms Table:</strong> The complete list of rooms for that faculty will be displayed.</li>
              <li>
                <strong>Two Tabs Available:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-700">
                  <li>
                    <strong>Rooms Tab:</strong> View and manage all room data
                    <ul className="list-circle list-inside ml-4 mt-1 space-y-1 text-gray-700">
                      <li>Edit room information (capacity, type, etc.)</li>
                      <li>Add new rooms</li>
                      <li>Delete rooms</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Availability Tab:</strong> Manage room availability
                    <ul className="list-circle list-inside ml-4 mt-1 space-y-1 text-gray-700">
                      <li>Allocate specific time slots to rooms</li>
                      <li>Mark rooms as available for specific hours/days</li>
                      <li><strong>Auto-Detect:</strong> If a timetable has already been created, you can use the auto-detect feature to automatically populate room availability based on the existing timetable</li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-sm text-blue-900"><strong>💡 Tip:</strong> Make sure all rooms and their availability are properly configured before creating the timetable, as this will prevent scheduling conflicts.</p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="step4_curriculum" title="Step 4: Configure Curriculum & Assign Teachers">
        <div className="space-y-4">
          <p className="text-gray-700">
            The Curriculum section shows all classes and their courses. This is where you assign teachers to specific courses.
          </p>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <a href="/curriculum" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Curriculum"</a> from the main menu.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">View Options:</h4>
            <p className="text-gray-700 mb-2">You can switch between two view types:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Box View:</strong> Shows a broader, detailed view of each curriculum with visual organization</li>
              <li><strong>List View:</strong> Shows curricula in a compact list format</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Assign Teachers to Courses:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click the <strong>"Edit"</strong> button on any curriculum/class.</li>
              <li><strong>Expand the Course List:</strong> Click on a course to see all available teachers.</li>
              <li><strong>Assign Teachers:</strong> Select one, two, or more teachers from the list to assign to that course. You can assign as many teachers as needed.</li>
              <li>Click <strong>"Save"</strong> to save your assignments.</li>
            </ol>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
            <p className="text-sm text-amber-900"><strong>⚠️ Important:</strong> Make sure all courses in the curriculum have at least one teacher assigned. This is crucial for successful timetable creation. Following all these steps will make your timetable creation journey easier and more convenient.</p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="step5_timetable" title="Step 5: Create & Publish Timetable">
        <div className="space-y-4">
          <p className="text-gray-700">
            Once all data (teachers, courses, rooms, and curriculum) is properly configured, you're ready to create the timetable.
          </p>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Next Steps:</h4>
            <p className="text-gray-700">
              Proceed to the <a href="/timetable" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Timetable"</a> section to create and publish your timetable. A detailed guide will be provided in the Timetable help section.
            </p>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="quick_tips" title="Quick Tips & Best Practices">
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Data Accuracy:</strong> Double-check all data before proceeding to avoid conflicts later.</li>
          <li><strong>Complete Information:</strong> Ensure all fields are filled in completely. Missing information can cause issues during timetable generation.</li>
          <li><strong>Sequential Workflow:</strong> Follow the steps in order for optimal results.</li>
          <li><strong>Search Function:</strong> Use the search/filter features to quickly find teachers, courses, or rooms.</li>
          <li><strong>Save Frequently:</strong> Always save your changes before navigating away from a page.</li>
        </ul>
      </HelpSection>
    </div>
  );

  const renderTTInchargeHelp = () => (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Help & User Manual</h1>
        </div>
        <p className="text-sm text-gray-600">Timetable Incharge - Guide</p>
      </div>

      <HelpSection id="ttincharge_overview" title="Getting Started - Timetable Incharge Overview">
        <div className="space-y-4">
          <p className="text-gray-700">
            As a Timetable Incharge, you manage the core aspects of timetable creation and management. Your main responsibilities include managing staff data, courses, rooms, and creating timetables.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Key Responsibilities:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Upload and Manage Staff Data (Teacher Load)</li>
              <li>Configure Courses (Course Load)</li>
              <li>Setup Rooms (Room Load)</li>
              <li>Configure Curriculum & Assign Teachers</li>
              <li>Create Timetable</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="tti_teacher" title="Staff Management - Teacher Load">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/teacher-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Staff"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Select faculty and department from dropdowns</li>
              <li>View the complete teacher table</li>
              <li>Click "Add Teacher" and fill required information</li>
              <li>Use "Save & Close" or "Save & Add More" as needed</li>
              <li>Use the search bar to verify added teachers</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="tti_course" title="Course Management - Course Load">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/course-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Courses"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Select faculty, department, and semester</li>
              <li>View and add/update courses as needed</li>
              <li>Ensure all course information is complete</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="tti_room" title="Room Management - Room Load">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/room-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Rooms"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Select faculty to view associated rooms</li>
              <li><strong>In Rooms Tab:</strong> Manage room information</li>
              <li><strong>In Availability Tab:</strong> Configure room availability</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="tti_curriculum" title="Configure Curriculum & Assign Teachers">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <a href="/curriculum" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Curriculum"</a> from the main menu.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Switch between Box View and List View as preferred</li>
              <li>Click "Edit" on any curriculum</li>
              <li>Expand course lists and assign teachers</li>
              <li>Save all changes</li>
            </ol>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
            <p className="text-sm text-amber-900"><strong>⚠️ Important:</strong> Ensure all courses have teachers assigned before creating the timetable.</p>
          </div>
        </div>
      </HelpSection>
    </div>
  );

  const renderHODHelp = () => (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Help & User Manual</h1>
        </div>
        <p className="text-sm text-gray-600">Head of Department (HOD) - Guide</p>
      </div>

      <HelpSection id="hod_overview" title="Getting Started - HOD Overview">
        <div className="space-y-4">
          <p className="text-gray-700">
            As a Head of Department (HOD), you have oversight of department-level operations including staff, courses, and curriculum for your department.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Key Responsibilities:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Manage Staff Data for your Department</li>
              <li>Configure Courses for your Department</li>
              <li>Setup Rooms for your Department</li>
              <li>Configure Curriculum & Assign Teachers</li>
              <li>Review Timetable</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="hod_teacher" title="Staff Management - Teacher Load">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/teacher-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Staff"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Your Department:</h4>
            <p className="text-gray-700 mb-2">
              As a HOD, you will see staff data filtered for your department. You can:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>View all teachers in your department</li>
              <li>Add new staff members</li>
              <li>Update teacher information</li>
              <li>Search for specific teachers</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="hod_course" title="Course Management - Course Load">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to the <strong>"Manage"</strong> menu → Click on <a href="/course-load" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Courses"</a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Your Courses:</h4>
            <p className="text-gray-700 mb-2">You can manage courses for your department across all semesters:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>View courses by semester</li>
              <li>Add new courses</li>
              <li>Update course information</li>
              <li>Configure course details</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="hod_curriculum" title="Curriculum Configuration">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <a href="/curriculum" className="text-blue-600 hover:text-blue-800 hover:underline font-semibold">"Curriculum"</a> from the main menu.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Assign Teachers:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Click "Edit" on your department's curriculum</li>
              <li>Expand courses to view available teachers</li>
              <li>Assign appropriate teachers to courses</li>
              <li>Save changes</li>
            </ol>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="hod_occupancy" title="View Occupancy">
        <div className="space-y-4">
          <p className="text-gray-700">
            You can view occupancy reports to monitor how resources are being used:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Teacher Occupancy:</strong> See workload distribution among teachers</li>
            <li><strong>Class Occupancy:</strong> Monitor class utilization</li>
            <li><strong>Room Occupancy:</strong> Track room usage across time slots</li>
          </ul>
        </div>
      </HelpSection>
    </div>
  );

  const renderTeacherHelp = () => (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Help & User Manual</h1>
        </div>
        <p className="text-sm text-gray-600">Teacher - Guide</p>
      </div>

      <HelpSection id="teacher_overview" title="Getting Started - Teacher Overview">
        <div className="space-y-4">
          <p className="text-gray-700">
            As a Teacher, you have access to view schedules and occupancy information. You can check your teaching schedule and class information.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Available Features:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>View Timetable Schedule</li>
              <li>Check Teacher Occupancy</li>
              <li>View Class Occupancy</li>
              <li>Monitor Room Occupancy</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="teacher_occupancy" title="View Your Occupancy">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <strong>"Occupancy"</strong> → Click on <strong>"Teacher Occupancy"</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">What You'll See:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Your teaching schedule and assigned classes</li>
              <li>Time slots and room allocations</li>
              <li>Your workload distribution</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="teacher_class" title="View Class Information">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <strong>"Occupancy"</strong> → Click on <strong>"Class Occupancy"</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Information Available:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Class schedules and assigned time slots</li>
              <li>Instructors assigned to your classes</li>
              <li>Room allocations</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="teacher_rooms" title="View Room Occupancy">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <strong>"Occupancy"</strong> → Click on <strong>"Room Occupancy"</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Information Available:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Room schedules and availability</li>
              <li>Room utilization across time slots</li>
              <li>Classes scheduled in each room</li>
            </ul>
          </div>
        </div>
      </HelpSection>
    </div>
  );

  const renderStudentHelp = () => (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-7 h-7 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Help & User Manual</h1>
        </div>
        <p className="text-sm text-gray-600">Student - Guide</p>
      </div>

      <HelpSection id="student_overview" title="Getting Started - Student Overview">
        <div className="space-y-4">
          <p className="text-gray-700">
            As a Student, you have access to view schedules and occupancy information. You can check your class schedule and room information.
          </p>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Available Features:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>View Your Class Schedule</li>
              <li>View Class Occupancy</li>
              <li>Monitor Room Occupancy</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="student_class" title="View Your Class Schedule">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <strong>"Occupancy"</strong> → Click on <strong>"Class Occupancy"</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Information Available:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Your class schedule and time slots</li>
              <li>Instructors assigned to your classes</li>
              <li>Room allocations and building locations</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="student_rooms" title="View Room Information">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How to Access:</h4>
            <p className="text-gray-700">
              Navigate to <strong>"Occupancy"</strong> → Click on <strong>"Room Occupancy"</strong>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Information Available:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Room schedules and class timings</li>
              <li>Room availability and utilization</li>
              <li>Instructors for each class</li>
            </ul>
          </div>
        </div>
      </HelpSection>

      <HelpSection id="student_tips" title="Quick Tips">
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Bookmark your schedule page for quick access each day.</li>
          <li>Check room locations when moving between classes.</li>
          <li>Use the occupancy view to plan your study schedule.</li>
        </ul>
      </HelpSection>
    </div>
  );

  const renderHelp = () => {
    switch (effectiveRole) {
      case "admin":
        return renderAdminHelp();
      case "tt_incharge":
        return renderTTInchargeHelp();
      case "hod":
        return renderHODHelp();
      case "teacher":
        return renderTeacherHelp();
      case "student":
        return renderStudentHelp();
      default:
        return renderAdminHelp();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {renderHelp()}
      </main>
      
      <Footer />
    </div>
  );
};

export default Help;
