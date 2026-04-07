"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import { useI18n } from "@/components/I18nProvider";

export default function SignInPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("auth.invalidCredentials"));
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleVtiLogin = () => {
    const vtiUrl = process.env.NEXT_PUBLIC_VTI_LOGIN_URL;
    if (vtiUrl) {
      window.location.href = vtiUrl;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ maxWidth: 420, width: "100%", mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <SchoolIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" fontWeight="bold">
              {t("app.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("app.description")}
            </Typography>
          </Box>

          {/* VTI SSO Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleVtiLogin}
            sx={{ mb: 2, py: 1.5 }}
          >
            {t("auth.vtiLogin")}
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("auth.or")}
            </Typography>
          </Divider>

          {/* Credentials Form */}
          <Box component="form" onSubmit={handleCredentialsLogin}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="outlined"
              size="large"
              disabled={loading}
              sx={{ mt: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : t("auth.signin")}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
