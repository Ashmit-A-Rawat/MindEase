import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import AvailableSlots from "./pages/student/AvailableSlots.jsx";
import MyAppointments from "./pages/student/MyAppointments.jsx";
import PeerSupport from "./pages/student/PeerSupport.jsx";
import Resources from "./pages/student/Resources.jsx";
import CounsellorDashboard from "./pages/counsellor/CounsellorDashboard.jsx";
import MySlots from "./pages/counsellor/MySlots.jsx";
import CounsellorAppointments from "./pages/counsellor/MyAppointments.jsx";
import ChatBot from "./pages/student/ChatBot.jsx";
import AllTests from "./pages/student/AllTests";
import TestPage from "./pages/student/TestPage";
import MyReports from "./pages/student/MyReports";
import TestReportView from "./pages/student/TestReportView";
import StudentList from "./pages/counsellor/StudentList";
import TestList from "./pages/counsellor/TestList";
import ReportView from "./pages/counsellor/ReportView";
import Analysis from "./pages/counsellor/Analysis";
import Home from "./pages/Home.jsx";
import ErrorElement from "./pages/ErrorElement.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import StudentForm from "./pages/StudentForm.jsx";
import ChatProvider from "./components/chat/Context/ChatProvider.jsx";
import DashboardHome from "./pages/student/DashboardHome.jsx";
import WellnessIntake from "./pages/student/WellnessIntake.jsx";
import './lib/i18n';



//function LoadingScreen() {
//  return (
//    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
//      <div className="text-center">
//        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//        <h2 className="text-xl font-semibold text-indigo-800">Loading MindEase</h2>
//        <p className="text-indigo-600">Please wait...</p>
//      </div>
//    </div>
//  );
//}

function App() {
  //const [loading, setLoading] = useState(true);
//
  //useEffect(() => {
  //  const timer = setTimeout(() => {
  //    setLoading(false);
  //  }, 1500);
//
  //  return () => clearTimeout(timer);
  //}, []);
//
  //if (loading) {
  //  return <LoadingScreen />;
  //}

  return (
    <Router>
      <ChatProvider>
      <Routes>
        {/* auth Router*/}
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/login" element={<Login/>}/>

        {/* verify route */}
        <Route path="/student/verify" element={<StudentForm/>}/>
        {/* Student Routes */}
        <Route path="/student/:studentId" element={<StudentDashboard />}>
          <Route index element={<DashboardHome/>} />
          <Route path="slots" element={<AvailableSlots />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="peer-support" element={<PeerSupport />} />
          <Route path="resources" element={<Resources />} />
          <Route path="ai-support" element={<ChatBot />} />
          <Route path="tests" element={<AllTests />} />
          <Route path="tests/:testType" element={<TestPage />} />
          <Route path="reports" element={<MyReports />} />
          <Route path="reports/:testId" element={<TestReportView />} />
          <Route path="wellness-intake" element={<WellnessIntake />} />
        </Route>

        {/* Counsellor Routes */}
        <Route path="/counsellor/:counsellorId" element={<CounsellorDashboard />}>
          <Route index element={<MySlots />} />
          <Route path="appointments" element={<CounsellorAppointments />} />
          <Route path="students" element={<StudentList />} />
          <Route path="students/:studentId/tests" element={<TestList />} />
          <Route path="students/:studentId/tests/:testId" element={<ReportView />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>

        
        {/* Default Routes */}
        <Route path="/" element={<Home/>} />
        
        {/* 404 Route */}
        <Route path="*" element={<ErrorElement/>} />
      </Routes>
      </ChatProvider>
    </Router>
  );
}

export default App;