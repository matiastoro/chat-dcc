"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/components/I18nProvider";

export function ChatInterface() {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 900, mx: "auto" }}>
      {/* Messages area */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <SmartToyIcon sx={{ fontSize: 64, color: "primary.light", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {t("chat.welcome")}
            </Typography>
          </Box>
        )}

        {messages.map((msg) => {
          const textContent = msg.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") ?? "";

          const reasoning = msg.parts
            ?.filter((p): p is { type: "reasoning"; reasoning: string } => p.type === "reasoning")
            .map((p) => p.reasoning)
            .join("") ?? "";

          if (!textContent && !reasoning) return null;

          return (
            <Box
              key={msg.id}
              sx={{
                display: "flex",
                gap: 1.5,
                mb: 2,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}
            >
              <Avatar
                sx={{
                  bgcolor: msg.role === "user" ? "secondary.main" : "primary.main",
                  width: 32,
                  height: 32,
                }}
              >
                {msg.role === "user" ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>
              <Box sx={{ maxWidth: "75%" }}>
                {/* Reasoning block */}
                {msg.role === "assistant" && reasoning && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      mb: textContent ? 0.5 : 0,
                      bgcolor: "grey.50",
                      borderLeft: 3,
                      borderColor: "warning.light",
                      borderRadius: 1,
                      fontSize: "0.85em",
                      color: "text.secondary",
                      fontStyle: "italic",
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold" sx={{ display: "block", mb: 0.5 }}>
                      Pensando...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      {reasoning}
                    </Typography>
                  </Paper>
                )}
                {/* Visible response */}
                {(textContent || msg.role === "user") && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: msg.role === "user" ? "primary.main" : "grey.100",
                      color: msg.role === "user" ? "white" : "text.primary",
                      borderRadius: 2,
                      "& p": { m: 0 },
                      "& p + p": { mt: 1 },
                      "& pre": {
                        bgcolor: msg.role === "user" ? "primary.dark" : "grey.200",
                        p: 1,
                        borderRadius: 1,
                        overflow: "auto",
                      },
                      "& code": { fontSize: "0.85em" },
                      "& ul, & ol": { pl: 2, my: 0.5 },
                      "& table": { borderCollapse: "collapse", width: "100%" },
                      "& th, & td": { border: "1px solid", borderColor: "divider", p: 0.5, fontSize: "0.85em" },
                    }}
                  >
                    {msg.role === "assistant" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                    ) : (
                      <Typography variant="body1">{textContent}</Typography>
                    )}
                  </Paper>
                )}
              </Box>
            </Box>
          );
        })}

        {isLoading && messages.at(-1)?.role !== "assistant" && (
          <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper elevation={0} sx={{ p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: "center", my: 2 }}>
            <Typography color="error" variant="body2">
              {t("chat.errorGeneric")}
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          gap: 1,
          bgcolor: "background.paper",
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder={t("chat.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={isLoading || !input.trim()}
          sx={{
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
            "&:disabled": { bgcolor: "grey.300" },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
