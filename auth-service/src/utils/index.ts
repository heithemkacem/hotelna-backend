import bcrypt from "bcryptjs";
import nodemailer from 'nodemailer' ;
import config from "../config/config";  // Adjust the path accordingly

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = config;

// Error Handling Class
class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string | undefined,
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Encrypt Password
const encryptPassword = async (password: string): Promise<string> => {
  const encryptedPassword = await bcrypt.hash(password, 12);
  return encryptedPassword;
};

// Compare Passwords
const isPasswordMatch = async (
  password: string,
  userPassword: string
): Promise<boolean> => {
  const result = await bcrypt.compare(password, userPassword);
  return result;
};

// Success Response
const successResponse = (
  res: any,
  message = "",
  data: Record<string, any> = {}
) => {
  return res.status(200).json({
    ok: true,
    status: "Success",
    message,
    data,
  });
};

// Error Response
const errorResponse = (res: any, message = "", statusCode = 400) => {
  return res.status(statusCode).json({
    ok: false,
    status: "Failed",
    message,
  });
};





// Function to generate a 6-digit OTP
const generateOTP = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
  return otp;
};

// Function to send OTP email
const sendEmail = async (email: string, title: string, body: string) => {
  try {
    const transporter = nodemailer.createTransport({
      
      host: SMTP_HOST,
        port: Number(SMTP_PORT),
        auth: {
          user: SMTP_USER!,
          pass: SMTP_PASS!,
      },
    });


    const info = await transporter.sendMail({
      from: "heithem.kacem@gmail.com",
      to: email,
      subject: title,
      html: body,
    });

    console.log("Email sent: ", info.response);
    return info;  // Return the info of the sent email
  } catch (error:any) {
    console.error("Error in mailSender:", error.message);
    throw new Error("Failed to send email");
  }
};


export {
  ApiError,
  encryptPassword,
  isPasswordMatch,
  successResponse,
  errorResponse,
  generateOTP,
  sendEmail
};
