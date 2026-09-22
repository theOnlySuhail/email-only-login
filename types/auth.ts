export interface LoginBody {
  email: string;
}

export interface OtpBody {
  otp: string;
}

export interface OtpToken {
  email: string;
  otpHash: string;
}

export interface AccessToken {
  email: string;
}
