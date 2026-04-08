"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
  Fab,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PsychologyIcon from "@mui/icons-material/Psychology";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/components/I18nProvider";

export function ChatInterface() {
  const { t } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [stickToBottom, setStickToBottom] = useState(true);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  // Detect if user scrolled away from bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setStickToBottom(isNearBottom);
  }, []);

  // Auto-scroll when stick-to-bottom is active and messages change
  useEffect(() => {
    if (stickToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, stickToBottom]);

  // Re-engage stick-to-bottom when user sends a message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    setStickToBottom(true);
    await sendMessage({ text });
  };

  const scrollToBottom = () => {
    setStickToBottom(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: 900,
        mx: "auto",
        // Center content when empty, anchor to bottom when messages exist
        justifyContent: hasMessages ? "flex-start" : "center",
      }}
    >
      {/* Empty state — centered welcome */}
      {!hasMessages && (
        <Box sx={{ textAlign: "center", px: 2, mb: 4 }}>
          <SmartToyIcon sx={{ fontSize: 64, color: "primary.light", mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" color="text.primary" gutterBottom>
            {t("app.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("chat.welcome")}
          </Typography>
        </Box>
      )}

      {/* Messages area — only visible when there are messages */}
      {hasMessages && (
        <Box
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{ flexGrow: 1, overflow: "auto", p: 2, position: "relative" }}
        >
          {messages.map((msg) => {
            const textContent = msg.parts
              ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("") ?? "";

            const reasoning = msg.parts
              ?.filter((p): p is { type: "reasoning"; text: string } => p.type === "reasoning")
              .map((p) => p.text)
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
                  {/* Reasoning block — collapsible */}
                  {msg.role === "assistant" && reasoning && (
                    <Accordion
                      disableGutters
                      elevation={0}
                      defaultExpanded={false}
                      sx={{
                        mb: textContent ? 0.5 : 0,
                        bgcolor: "grey.50",
                        borderLeft: 3,
                        borderColor: "warning.light",
                        borderRadius: "4px !important",
                        "&::before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary" }} />}
                        sx={{ minHeight: 36, py: 0, px: 1.5, "& .MuiAccordionSummary-content": { my: 0.5 } }}
                      >
                        <PsychologyIcon sx={{ fontSize: 16, mr: 0.5, color: "warning.main" }} />
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">
                          Pensamiento
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", fontStyle: "italic", fontSize: "0.85em" }}>
                          {reasoning}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
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

          {/* Scroll to bottom FAB */}
          {!stickToBottom && (
            <Fab
              size="small"
              onClick={scrollToBottom}
              sx={{
                position: "sticky",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                bgcolor: "background.paper",
                color: "text.secondary",
                boxShadow: 2,
                "&:hover": { bgcolor: "grey.100" },
              }}
            >
              <KeyboardArrowDownIcon />
            </Fab>
          )}
        </Box>
      )}

      {/* Input area */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: hasMessages ? 1 : 0,
          borderColor: "divider",
          display: "flex",
          gap: 1,
          bgcolor: "background.paper",
          maxWidth: hasMessages ? "100%" : 600,
          mx: "auto",
          width: "100%",
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
          autoFocus
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
