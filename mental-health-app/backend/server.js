import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import axios from "axios";

const app = express();

// FIXED: Enhanced CORS configuration to handle multiple ports
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// FIXED: Handle preflight OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});

// FIXED: Better MongoDB connection with error handling
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mentalhealth", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('💡 Make sure MongoDB is running: mongod --dbpath /path/to/db');
  }
};

connectDB();

// Schema for storing assessments
const AssessmentSchema = new mongoose.Schema({
  userId: String,
  responses: [mongoose.Schema.Types.Mixed],
  prediction: Number,
  probability: Number,
  analysis: {
    risk_level: String,
    risk_color: String,
    description: String,
    probability_percentage: Number,
    prediction: Number,
    suggestions: [String],
    professional_resources: {
      crisis_lines: [String],
      online_resources: [String]
    },
    next_steps: [String]
  },
  createdAt: { type: Date, default: Date.now },
});

const Assessment = mongoose.model("Assessment", AssessmentSchema);

// Helper function to convert response object to array
function convertResponsesToArray(responses) {
  // If it's already an array, return it
  if (Array.isArray(responses)) {
    return responses;
  }
  
  // If it's an object, convert to array in the correct order
  if (typeof responses === 'object' && responses !== null) {
    const orderedKeys = [
      'id', 'Gender', 'Age', 'City', 'Profession', 
      'AcademicPressure', 'WorkPressure', 'CGPA', 
      'StudySatisfaction', 'JobSatisfaction', 'SleepDuration',
      'DietaryHabits', 'Degree', 'SuicidalThoughts', 
      'WorkStudyHours', 'FinancialStress', 'FamilyHistory'
    ];
    
    return orderedKeys.map(key => responses[key] || '');
  }
  
  return [];
}

// FIXED: Better health check with ML service fallback
app.get("/api/health", async (req, res) => {
  try {
    console.log("Health check requested");
    
    let mlServiceStatus = "unreachable";
    
    try {
      // Check ML service with shorter timeout
      const mlHealth = await axios.get("http://127.0.0.1:5001/health", { 
        timeout: 3000 
      });
      mlServiceStatus = mlHealth.data;
    } catch (mlError) {
      console.log("ML service check failed:", mlError.message);
      mlServiceStatus = {
        status: "unreachable",
        message: "ML service not running on port 5001"
      };
    }
    
    const healthStatus = {
      backend: "healthy",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      ml_service: mlServiceStatus,
      timestamp: new Date().toISOString(),
      ports: {
        backend: process.env.PORT || 8000,
        ml_service: 5001,
        expected_frontend: [5173, 5174, 3000]
      }
    };
    
    console.log("Health check response:", healthStatus);
    res.json(healthStatus);
    
  } catch (error) {
    console.error("Health check error:", error.message);
    
    const healthStatus = {
      backend: "error",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      ml_service: "unreachable",
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(healthStatus);
  }
});

// API: Submit assessment - FIXED to handle both object and array responses
app.post("/api/submit", async (req, res) => {
  console.log("\n=== NEW SUBMISSION REQUEST ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  
  try {
    const { userId, responses: rawResponses } = req.body;

    console.log("Received submission:", { 
      userId, 
      rawResponsesType: typeof rawResponses,
      rawResponses: rawResponses
    });

    // Validate input
    if (!rawResponses) {
      console.error("No responses provided");
      return res.status(400).json({ 
        success: false,
        error: "No responses provided" 
      });
    }

    // Convert responses to array format that ML API expects
    const responses = convertResponsesToArray(rawResponses);
    
    console.log("Converted responses:", { 
      length: responses.length,
      responses: responses
    });

    if (responses.length === 0) {
      console.error("Empty responses array after conversion");
      return res.status(400).json({ 
        success: false,
        error: "No valid responses found" 
      });
    }

    console.log("Calling ML API with responses:", responses);

    let mlResponse;
    try {
      // Call Python ML API with extended timeout
      mlResponse = await axios.post("http://127.0.0.1:5001/predict", { 
        responses: responses 
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (mlError) {
      console.error("ML API Error:", mlError.message);
      
      // FALLBACK: Return mock response if ML service is down
      if (mlError.code === 'ECONNREFUSED') {
        console.log("ML service down, using fallback response");
        
        // Check for high-risk indicators in fallback
        const hasSuicidalThoughts = responses[13] && responses[13].toString().toLowerCase() === 'yes';
        const highAcademicPressure = responses[5] && parseFloat(responses[5]) >= 3;
        const highWorkPressure = responses[6] && parseFloat(responses[6]) >= 3;
        const poorSleep = responses[10] && parseFloat(responses[10]) < 4;
        
        let fallbackRisk = "Low Risk";
        let fallbackProbability = 0.2;
        let fallbackSuggestions = [
          "Continue maintaining healthy lifestyle habits",
          "Practice stress management techniques",
          "Maintain regular sleep schedule"
        ];
        
        if (hasSuicidalThoughts) {
          fallbackRisk = "CRITICAL RISK";
          fallbackProbability = 0.95;
          fallbackSuggestions = [
            "CALL 911 or go to your nearest emergency room immediately",
            "Contact the National Suicide Prevention Lifeline: 988",
            "Do not leave the person alone - stay with them or have someone stay with them"
          ];
        } else if (highAcademicPressure && highWorkPressure && poorSleep) {
          fallbackRisk = "High Risk";
          fallbackProbability = 0.7;
          fallbackSuggestions = [
            "Seek professional mental health support immediately",
            "Contact your healthcare provider or a mental health crisis line",
            "Consider campus counseling services if you're a student"
          ];
        } else if (highAcademicPressure || highWorkPressure) {
          fallbackRisk = "Moderate Risk";
          fallbackProbability = 0.5;
          fallbackSuggestions = [
            "Consider speaking with a mental health counselor",
            "Practice stress reduction techniques like mindfulness",
            "Evaluate your workload and consider adjustments if possible"
          ];
        }
        
        mlResponse = {
          data: {
            prediction: fallbackRisk === "Low Risk" ? 0 : 1,
            probability: fallbackProbability,
            analysis: {
              risk_level: fallbackRisk,
              risk_color: fallbackRisk === "CRITICAL RISK" ? "darkred" : 
                         fallbackRisk === "High Risk" ? "red" : 
                         fallbackRisk === "Moderate Risk" ? "yellow" : "green",
              description: fallbackRisk === "CRITICAL RISK" ? 
                "IMMEDIATE PROFESSIONAL INTERVENTION REQUIRED" :
                "Assessment completed (ML service unavailable)",
              probability_percentage: Math.round(fallbackProbability * 100),
              prediction: fallbackRisk === "Low Risk" ? 0 : 1,
              suggestions: fallbackSuggestions,
              professional_resources: {
                crisis_lines: [
                  "National Suicide Prevention Lifeline: 988",
                  "Crisis Text Line: Text HOME to 741741",
                  "SAMHSA National Helpline: 1-800-662-4357"
                ],
                online_resources: [
                  "Mental Health America: mhanational.org",
                  "National Alliance on Mental Illness: nami.org",
                  "Psychology Today Therapist Finder: psychologytoday.com"
                ]
              },
              next_steps: fallbackRisk === "CRITICAL RISK" ? 
                ["IMMEDIATE ACTION: Call 911 or go to emergency room"] :
                ["Schedule a follow-up assessment", "Consider professional consultation"]
            },
            safety_override: hasSuicidalThoughts
          }
        };
      } else {
        throw mlError; // Re-throw other errors
      }
    }

    console.log("ML API Response Status:", mlResponse?.status || "fallback");
    console.log("ML API Response Data:", mlResponse.data);

    // Validate ML response
    if (!mlResponse.data) {
      throw new Error("Empty response from ML service");
    }

    // Save to database if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const assessment = new Assessment({
          userId: userId || "anonymous",
          responses: responses,
          prediction: mlResponse.data.prediction,
          probability: mlResponse.data.probability,
          analysis: mlResponse.data.analysis || {},
        });

        console.log("Saving assessment to database...");
        await assessment.save();
        console.log("Assessment saved to database successfully");
      } catch (dbError) {
        console.error("Database save error:", dbError.message);
        // Continue without saving to DB
      }
    } else {
      console.log("Database not connected, skipping save");
    }

    // Create the response object
    const resultToSend = {
      success: true,
      prediction: mlResponse.data.prediction,
      probability: mlResponse.data.probability,
      analysis: mlResponse.data.analysis,
      timestamp: new Date().toISOString(),
      fallback_used: mlResponse.status === undefined,
      safety_override: mlResponse.data.safety_override || false
    };

    console.log("=== SENDING RESPONSE TO FRONTEND ===");
    console.log("Response object:", JSON.stringify(resultToSend, null, 2));
    
    // Set headers explicitly
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    
    // Send response
    res.status(200).json(resultToSend);
    
    console.log("=== RESPONSE SENT SUCCESSFULLY ===");

  } catch (error) {
    console.error("\n=== ERROR IN /api/submit ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    let statusCode = 500;
    let errorResponse = {
      success: false,
      error: "Internal server error",
      details: error.message,
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      // ML API returned an error
      statusCode = error.response.status;
      errorResponse = {
        success: false,
        error: "ML prediction failed",
        details: error.response.data,
        mlStatus: error.response.status,
        timestamp: new Date().toISOString()
      };
      console.error("ML API Error Response:", error.response.data);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      statusCode = 408;
      errorResponse = {
        success: false,
        error: "Request timeout",
        details: "ML service took too long to respond",
        timestamp: new Date().toISOString()
      };
    }

    console.log("Sending error response:", errorResponse);
    
    // Set headers for error response too
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    
    res.status(statusCode).json(errorResponse);
  }
});

// API: Get user's assessment history
app.get("/api/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Fetching history for user:", userId);
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: "Database not connected"
      });
    }
    
    const assessments = await Assessment.find({ userId }).sort({ createdAt: -1 });
    console.log(`Found ${assessments.length} assessments for user ${userId}`);
    
    res.json({
      success: true,
      data: assessments,
      count: assessments.length
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch history",
      details: error.message 
    });
  }
});

// API: Get all assessments (for admin/analysis)
app.get("/api/assessments", async (req, res) => {
  try {
    console.log("Fetching all assessments");
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: "Database not connected"
      });
    }
    
    const assessments = await Assessment.find({}).sort({ createdAt: -1 });
    console.log(`Found ${assessments.length} total assessments`);
    
    res.json({
      success: true,
      data: assessments,
      count: assessments.length
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch assessments",
      details: error.message 
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log("404 - Route not found:", req.method, req.path);
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log(`🔧 CORS enabled for ports: 5173, 5174, 3000`);
});

// Handle database connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.log('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('📊 MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});