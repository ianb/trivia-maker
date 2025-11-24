const { useState, useEffect, useRef } = React;

function AuthForm({ onSignIn, onSignUp, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (isSignUp) {
      onSignUp(username, password);
    } else {
      onSignIn(username, password);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsSignUp(false)}
          className="flex-1 px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
          style={{
            background: !isSignUp ? "#4CAF50" : "#9E9E9E",
            color: "#FFF",
            border: "3px solid #2D5016",
            boxShadow: "3px 3px 0px #1A3009",
            fontFamily: "monospace",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          Sign In
        </button>
        <button
          onClick={() => setIsSignUp(true)}
          className="flex-1 px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
          style={{
            background: isSignUp ? "#4CAF50" : "#9E9E9E",
            color: "#FFF",
            border: "3px solid #2D5016",
            boxShadow: "3px 3px 0px #1A3009",
            fontFamily: "monospace",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            className="w-full px-4 py-3 font-bold pixel-button"
            style={{
              background: "#FFF",
              border: "3px solid #2D5016",
              boxShadow: "3px 3px 0px #1A3009",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 font-bold pixel-button"
            style={{
              background: "#FFF",
              border: "3px solid #2D5016",
              boxShadow: "3px 3px 0px #1A3009",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          />
        </div>
        {error && (
          <div
            className="mb-4 p-3 text-center"
            style={{
              background: "#FFEBEE",
              border: "3px solid #F44336",
              color: "#C62828",
              fontFamily: "monospace",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full px-4 py-3 font-bold pixel-button transition-all active:scale-95"
          style={{
            background: "#4CAF50",
            color: "#FFF",
            border: "3px solid #2D5016",
            boxShadow: "3px 3px 0px #1A3009",
            fontFamily: "monospace",
            fontSize: "14px",
            textTransform: "uppercase",
          }}
        >
          {isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

function TriviaMaker() {
  const [cards, setCards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAiCategoryDropdown, setShowAiCategoryDropdown] = useState(false);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [openRouterToken, setOpenRouterToken] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [aiCategory, setAiCategory] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [longestGenerationTime, setLongestGenerationTime] = useState(0);
  const [keepingCardIndex, setKeepingCardIndex] = useState(null);
  const [rejectedQuestions, setRejectedQuestions] = useState({}); // { category: [{question, answer, annotation}] }
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [fullScreenCard, setFullScreenCard] = useState(null);
  const [showFullScreenAnswer, setShowFullScreenAnswer] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [printMode, setPrintMode] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showAnswersInTable, setShowAnswersInTable] = useState(false);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const generationTimerRef = useRef(null);
  const generationStartRef = useRef(null);

  // Helper function to count words in text (strips markdown/html)
  function countWords(text) {
    if (!text) return 0;
    // Strip markdown syntax first (basic patterns)
    let plainText = text
      .replace(/#{1,6}\s+/g, "") // Headers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
      .replace(/\*([^*]+)\*/g, "$1") // Italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Links
      .replace(/`([^`]+)`/g, "$1") // Inline code
      .replace(/```[\s\S]*?```/g, "") // Code blocks
      .replace(/\n/g, " "); // Newlines to spaces

    // If marked is available, parse and strip HTML
    if (typeof marked !== "undefined") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = marked.parse(plainText);
      plainText = tempDiv.textContent || tempDiv.innerText || "";
    }

    // Count words (split by whitespace and filter empty strings)
    const words = plainText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length;
  }

  // Helper function to generate random string
  function generateRandomString(length) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper function to base64url encode
  function base64UrlEncode(str) {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // Helper function to create SHA-256 code challenge
  async function createSHA256CodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashString = String.fromCharCode.apply(null, hashArray);
    return base64UrlEncode(hashString);
  }

  // Load cards and token from localStorage on mount, and handle OAuth callback
  useEffect(() => {
    const saved = localStorage.getItem("triviaCards");
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load cards:", e);
      }
    }
    const savedToken = localStorage.getItem("openRouterToken");
    if (savedToken) {
      setOpenRouterToken(savedToken);
    }
    const savedRejected = localStorage.getItem("rejectedQuestions");
    if (savedRejected) {
      try {
        setRejectedQuestions(JSON.parse(savedRejected));
      } catch (e) {
        console.error("Failed to load rejected questions:", e);
      }
    }

    const savedLongestTime = localStorage.getItem("longestGenerationTime");
    if (savedLongestTime) {
      const parsedTime = parseInt(savedLongestTime, 10);
      if (!Number.isNaN(parsedTime)) {
        setLongestGenerationTime(parsedTime);
      }
    }

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Initialize Userbase
    if (typeof userbase !== "undefined") {
      userbase
        .init({ appId: "d46aee59-92c9-4796-9253-c8e7dc1d3ee0" })
        .then((session) => {
          if (session.user) {
            setUser(session.user);
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    // Check for ?login query parameter
    const loginUrlParams = new URLSearchParams(window.location.search);
    setShowLoginButton(loginUrlParams.has("login"));
  }, []);

  // Track elapsed time while generating questions
  useEffect(() => {
    if (isGenerating) {
      setGenerationElapsed(0);
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
      }
      generationTimerRef.current = setInterval(() => {
        setGenerationElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setGenerationElapsed(0);
    }

    return () => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
    };
  }, [isGenerating]);

  async function handleOAuthCallback(code) {
    const codeVerifier = sessionStorage.getItem("openRouterCodeVerifier");
    const codeChallengeMethod = sessionStorage.getItem(
      "openRouterCodeChallengeMethod"
    );

    if (!codeVerifier) {
      console.error("No code verifier found in session storage");
      return;
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          code_verifier: codeVerifier,
          code_challenge_method: codeChallengeMethod || "S256",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to exchange code: ${error}`);
      }

      const { key } = await response.json();
      localStorage.setItem("openRouterToken", key);
      setOpenRouterToken(key);

      // Clean up session storage
      sessionStorage.removeItem("openRouterCodeVerifier");
      sessionStorage.removeItem("openRouterCodeChallengeMethod");
    } catch (error) {
      console.error("Error exchanging OAuth code:", error);
      alert("Failed to connect to OpenRouter. Please try again.");
    }
  }

  async function handleConnectOpenRouter() {
    // Generate code verifier and challenge
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await createSHA256CodeChallenge(codeVerifier);

    // Store verifier in session storage for later use
    sessionStorage.setItem("openRouterCodeVerifier", codeVerifier);
    sessionStorage.setItem("openRouterCodeChallengeMethod", "S256");

    // Get current URL for callback
    const callbackUrl = window.location.origin + window.location.pathname;

    // Redirect to OpenRouter auth
    const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(
      callbackUrl
    )}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = authUrl;
  }

  // Save cards to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("triviaCards", JSON.stringify(cards));
  }, [cards]);

  // Save rejected questions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "rejectedQuestions",
      JSON.stringify(rejectedQuestions)
    );
  }, [rejectedQuestions]);

  function handleAddCard() {
    if (newQuestion.trim() && newAnswer.trim()) {
      const newCard = {
        id: Date.now(),
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        category: newCategory.trim() || "Uncategorized",
      };
      setCards([...cards, newCard]);
      setNewQuestion("");
      setNewAnswer("");
      setNewCategory("");
    }
  }

  function handleDeleteCard(id) {
    setCards(cards.filter((card) => card.id !== id));
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleStartEdit(id) {
    const card = cards.find((c) => c.id === id);
    if (card) {
      setEditingId(id);
      setNewQuestion(card.question);
      setNewAnswer(card.answer);
      setNewCategory(card.category || "");
    }
  }

  function handleSaveEdit() {
    if (editingId && newQuestion.trim() && newAnswer.trim()) {
      setCards(
        cards.map((card) =>
          card.id === editingId
            ? {
                ...card,
                question: newQuestion.trim(),
                answer: newAnswer.trim(),
                category: newCategory.trim() || "Uncategorized",
              }
            : card
        )
      );
      setEditingId(null);
      setNewQuestion("");
      setNewAnswer("");
      setNewCategory("");
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setNewQuestion("");
    setNewAnswer("");
    setNewCategory("");
  }

  function toggleFlip(id) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleRemoveToken() {
    localStorage.removeItem("openRouterToken");
    setOpenRouterToken("");
  }

  function handleExportCards() {
    const exportData = {
      triviaQuestions: cards.map((card) => ({
        question: card.question,
        answer: card.answer,
        category: card.category || "Uncategorized",
      })),
      rejectedQuestions: rejectedQuestions,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trivia-cards.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImportCards(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.triviaQuestions && Array.isArray(data.triviaQuestions)) {
          const importedCards = data.triviaQuestions.map((item, index) => ({
            id: Date.now() + index,
            question: item.question || "",
            answer: item.answer || "",
            category: item.category || "Uncategorized",
          }));

          let importMessage = `Import ${importedCards.length} card(s)?`;
          if (
            data.rejectedQuestions &&
            Object.keys(data.rejectedQuestions).length > 0
          ) {
            const feedbackCount = Object.values(data.rejectedQuestions).reduce(
              (sum, arr) => sum + arr.length,
              0
            );
            importMessage += ` This will also import ${feedbackCount} feedback item(s).`;
          }
          importMessage +=
            " This will add them to your existing cards and feedback.";

          if (confirm(importMessage)) {
            setCards([...cards, ...importedCards]);
            if (data.rejectedQuestions) {
              setRejectedQuestions((prev) => {
                const merged = { ...prev };
                Object.keys(data.rejectedQuestions).forEach((category) => {
                  if (merged[category]) {
                    merged[category] = [
                      ...merged[category],
                      ...data.rejectedQuestions[category],
                    ];
                  } else {
                    merged[category] = data.rejectedQuestions[category];
                  }
                });
                return merged;
              });
            }
          }
        } else {
          alert('Invalid file format. Expected {"triviaQuestions": [...]}');
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Failed to parse JSON file. Please check the file format.");
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = "";
  }

  async function handleGenerateQuestions() {
    if (!aiCategory.trim() || !openRouterToken) {
      alert("Please enter a category and ensure OpenRouter is connected.");
      return;
    }

    generationStartRef.current = Date.now();
    setIsGenerating(true);
    setGeneratedQuestions([]);

    try {
      // Get existing questions in this category
      const categoryCards = cards.filter(
        (card) =>
          (card.category || "Uncategorized") ===
          (aiCategory.trim() || "Uncategorized")
      );
      const existingQuestionsText = categoryCards
        .map((card) => `Q: ${card.question}  A: ${card.answer}`)
        .join("\n");

      // Get rejected questions for this category
      const categoryKey = aiCategory.trim() || "Uncategorized";
      const categoryRejected = rejectedQuestions[categoryKey] || [];

      // Separate rejected questions by type
      const tooEasyRejected = categoryRejected.filter(
        (r) => r.annotation === "too-easy"
      );
      const tooHardRejected = categoryRejected.filter(
        (r) => r.annotation === "too-hard"
      );
      const otherRejected = categoryRejected.filter(
        (r) => r.annotation === "other" || r.annotation === "format"
      );

      let rejectedText = "";

      if (tooEasyRejected.length > 0) {
        const tooEasyText = tooEasyRejected
          .map(
            (rejected) =>
              `<too-easy user-feedback="${(rejected.userFeedback || "").replace(
                /"/g,
                "&quot;"
              )}">Q: ${rejected.question}  A: ${rejected.answer}</too-easy>`
          )
          .join("\n");
        rejectedText += `Questions marked as too easy:\n${tooEasyText}\n\n`;
      }

      if (tooHardRejected.length > 0) {
        const tooHardText = tooHardRejected
          .map(
            (rejected) =>
              `<too-hard user-feedback="${(rejected.userFeedback || "").replace(
                /"/g,
                "&quot;"
              )}">Q: ${rejected.question}  A: ${rejected.answer}</too-hard>`
          )
          .join("\n");
        rejectedText += `Questions marked as too hard:\n${tooHardText}\n\n`;
      }

      if (otherRejected.length > 0) {
        const otherText = otherRejected
          .map((rejected) =>
            (rejected.userFeedback || "").trim()
              ? `<rejected-with-feedback user-feedback="${(
                  rejected.userFeedback || ""
                ).replace(/"/g, "&quot;")}">Q: ${rejected.question}  A: ${
                  rejected.answer
                }</rejected-with-feedback>`
              : `<rejected-without-feedback>Q: ${rejected.question}  A: ${rejected.answer}</rejected-without-feedback>`
          )
          .join("\n");
        rejectedText += `Questions with other issues:\n${otherText}\n\n`;
      }

      // Build the prompt
      let prompt = `Generate questions for the category: <category>${aiCategory}</category>\n\nGenerate 5 trivia questions about this category.\n\n`;

      if (existingQuestionsText) {
        prompt += `Here are accepted questions in this category (these are good examples, but questions shouldn't duplicate any of these):\n<accepted-questions>\n${existingQuestionsText}\n</accepted-questions>\n\n`;
      }

      if (rejectedText) {
        prompt += `Here are some questions that were rejected with feedback:\n<rejected-questions>\n${rejectedText}\n</rejected-questions>\n\n`;
        prompt += `You may generate a similar question to those that were rejected, so long as you incorporate the feedback.\n\n`;
      }

      if (aiInput.trim()) {
        prompt += `<additional-user-instructions>\n${aiInput.trim()}\n</additional-user-instructions>\n\n`;
      }

      const requestBody = {
        model: "openai/gpt-5.1",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "trivia_questions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: {
                        type: "string",
                        description: "The trivia question",
                      },
                      answer: {
                        type: "string",
                        description: "The answer to the trivia question",
                      },
                      answerInQuestion: {
                        type: "boolean",
                        description:
                          "Does the answer appear in part in the question? For example: does the question contain one of the words from the answer, a different form of the word, or something else that gives away the answer?",
                      },
                      alternateQuestion: {
                        type: "string",
                        description:
                          "IF answerInQuestion is true, then compose an alternate version of the question that does not give away the answer.",
                      },
                    },
                    required: [
                      "question",
                      "answer",
                      "answerInQuestion",
                      "alternateQuestion",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content: `
You are a trivia question generator. You are making questions with compact questions and a canonical answer. Answers should be short and clear (though you may include an explanation in parenthesis if there are multiple possible answers)

# GENERATING

Questions and answers may include Markdown formatting and emoji, but make them easy to read out loud.

Question generation advice:
1. The contestants will know the category, so the category cannot be the answer to the question
2. Unlike category, contestants will NOT know any additional-user-instructions
3. It should be clear early in the question what kind of answer you expect (e.g., when talking about music you should indicate if the expected answer is a song, artist, album, etc.)
4. Avoid answers that appear in other questions, such as asking "What notable landmark is in Paris" and then asking "What is the capital of France?"

# LEARNING

You may be given feedback on questions that were rejected, as well as a list of accepted questions. Think about these things:

1. Given any questions marked too hard or too easy, theorize on the difficulty levels that are within range. Accepted questions also demonstrate acceptable difficulty levels.
2. Given any questions that were rejected-without-feedback, theorize on what would make them boring or uninteresting (so you can avoid this in future questions).
3. Given any questions that were rejected-with-feedback, use that feedback to rephrase the question (unless you see a rephrased question in the accepted questions). Consider the how to generalize the feedback to aid question generation.
`.trim(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        reasoning: {
          effort: "medium",
          exclude: false,
          enabled: true,
        },
      };

      console.group("LLM Request");
      console.log(
        "%csystem:",
        "color: #9C27B0; font-weight: bold",
        requestBody.messages[0].content
      );
      console.log("%cuser:", "color: #2196F3; font-weight: bold", prompt);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      console.log(
        "%cLLM Full Response:",
        "color: #2196F3; font-weight: bold",
        data
      );

      // Parse the structured JSON response
      let questions = [];
      try {
        const parsed = JSON.parse(content);
        console.log(
          "%cLLM Structured Response:",
          "color: #4CAF50; font-weight: bold",
          parsed
        );
        if (data.choices[0].message?.reasoning) {
          console.log(
            "%cLLM Reasoning:",
            "color: #FF9800; font-weight: bold",
            data.choices[0].message.reasoning
          );
        }

        // Extract questions from the structured response
        let rawQuestions = [];
        if (parsed.questions && Array.isArray(parsed.questions)) {
          rawQuestions = parsed.questions;
        } else if (Array.isArray(parsed)) {
          // Fallback: if it's directly an array
          rawQuestions = parsed;
        } else {
          throw new Error("Response does not contain a questions array");
        }

        // Process questions: use alternateQuestion if answerInQuestion is true
        questions = rawQuestions.map((item) => {
          const finalQuestion =
            item.answerInQuestion === true &&
            item.alternateQuestion &&
            item.alternateQuestion.trim()
              ? item.alternateQuestion.trim()
              : item.question;

          // Log substitution if it happened
          if (
            item.answerInQuestion === true &&
            item.alternateQuestion &&
            item.alternateQuestion.trim()
          ) {
            console.log("Question substitution made:", {
              original: item.question,
              alternate: item.alternateQuestion,
              answer: item.answer,
            });
          }

          // Return only question and answer (final values)
          return {
            question: finalQuestion,
            answer: item.answer,
          };
        });
      } catch (parseError) {
        console.error("Failed to parse structured response:", parseError);
        console.error("Raw content:", content);
        alert("Failed to parse AI response. Please try again.");
        return;
      }

      setGeneratedQuestions(questions);

      // Play sound if tab is in background
      if (document.hidden) {
        const audio = new Audio("assets/ding.wav");
        audio.play().catch((err) => {
          // Ignore errors (e.g., user hasn't interacted with page)
          console.log("Could not play notification sound:", err);
        });
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      console.groupEnd();
      alert(`Failed to generate questions: ${error.message}`);
    } finally {
      if (generationStartRef.current) {
        const totalSeconds = Math.max(
          0,
          Math.round((Date.now() - generationStartRef.current) / 1000)
        );
        generationStartRef.current = null;

        if (totalSeconds > 0) {
          setLongestGenerationTime((prev) => {
            if (totalSeconds > prev) {
              localStorage.setItem(
                "longestGenerationTime",
                String(totalSeconds)
              );
              return totalSeconds;
            }
            return prev;
          });
        }
      }
      console.groupEnd();
      setIsGenerating(false);
    }
  }

  function handleKeepQuestion(question, answer, index) {
    // Add transition animation
    setKeepingCardIndex(index);

    setTimeout(() => {
      const newCard = {
        id: Date.now(),
        question: question.trim(),
        answer: answer.trim(),
        category: aiCategory.trim() || "Uncategorized",
      };
      setCards([...cards, newCard]);
      // Remove the question from the generated list
      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
      setKeepingCardIndex(null);
    }, 300);
  }

  function handleRejectQuestion(question, answer, index, annotation) {
    // Get feedback from user
    const promptMessages = {
      "too-easy": "Why is this question too easy?",
      "too-hard": "Why is this question too hard?",
      other:
        "What issue does this question have? (e.g., poor question length, ambiguous answer, answer revealed in question, boring, etc.)",
    };

    const userFeedback = window.prompt(
      promptMessages[annotation] || "Why was this question rejected?"
    );

    // If user cancels, don't reject
    if (userFeedback === null) {
      return;
    }

    // Add transition animation
    setKeepingCardIndex(index);

    setTimeout(() => {
      const categoryKey = aiCategory.trim() || "Uncategorized";
      setRejectedQuestions((prev) => {
        const categoryRejected = prev[categoryKey] || [];
        return {
          ...prev,
          [categoryKey]: [
            ...categoryRejected,
            {
              question: question.trim(),
              answer: answer.trim(),
              annotation: annotation,
              userFeedback: userFeedback.trim() || "",
            },
          ],
        };
      });
      // Remove the question from the generated list
      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
      setKeepingCardIndex(null);
    }, 300);
  }

  function handleClearFeedback() {
    const categoryKey = aiCategory.trim() || "Uncategorized";
    setRejectedQuestions((prev) => {
      const updated = { ...prev };
      delete updated[categoryKey];
      return updated;
    });
  }

  function handleOpenFullScreen() {
    if (cards.length === 0) {
      alert("No cards available!");
      return;
    }
    const randomIndex = Math.floor(Math.random() * cards.length);
    setFullScreenCard(cards[randomIndex]);
    setShowFullScreenAnswer(false);
    setFullScreenMode(true);
  }

  function handleNextRandomCard() {
    if (cards.length === 0) return;
    const randomIndex = Math.floor(Math.random() * cards.length);
    setFullScreenCard(cards[randomIndex]);
    setShowFullScreenAnswer(false);
  }

  function handleCloseFullScreen() {
    setFullScreenMode(false);
    setFullScreenCard(null);
    setShowFullScreenAnswer(false);
  }

  function handleSignUp(username, password) {
    if (typeof userbase === "undefined") {
      setAuthError("Userbase SDK not loaded");
      return;
    }
    userbase
      .signUp({ username, password, rememberMe: "local" })
      .then((user) => {
        setUser(user);
        setAuthError("");
        setShowAuthDialog(false);
      })
      .catch((error) => {
        setAuthError(error.message || "Sign up failed");
      });
  }

  function handleSignIn(username, password) {
    if (typeof userbase === "undefined") {
      setAuthError("Userbase SDK not loaded");
      return;
    }
    userbase
      .signIn({ username, password, rememberMe: "local" })
      .then((user) => {
        setUser(user);
        setAuthError("");
        setShowAuthDialog(false);
      })
      .catch((error) => {
        setAuthError(error.message || "Sign in failed");
      });
  }

  function handleSignOut() {
    if (typeof userbase === "undefined") {
      return;
    }
    userbase
      .signOut()
      .then(() => {
        setUser(null);
        setAuthError("");
      })
      .catch((error) => {
        setAuthError(error.message || "Sign out failed");
      });
  }

  function handleToggleCardSelection(cardId) {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(cards.map((card) => card.id)));
    }
  }

  function handlePrint() {
    if (selectedCards.size === 0) {
      alert("Please select at least one card to print.");
      return;
    }

    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintMode(false);
      }, 100);
    }, 100);
  }

  // Get unique categories from existing cards, filtered by current input
  const existingCategories = Array.from(
    new Set(cards.map((card) => card.category).filter(Boolean))
  )
    .filter((cat) =>
      newCategory.trim()
        ? cat.toLowerCase().includes(newCategory.toLowerCase())
        : true
    )
    .sort();

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          background: "#A8D5BA",
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          )`,
        }}
      >
        <div
          className="pixel-card p-8 text-center"
          style={{
            background: "#FFF9C4",
            border: "6px solid #2D5016",
            boxShadow: "12px 12px 0px #1A3009",
          }}
        >
          <h1
            className="text-3xl font-bold mb-4 pixel-font"
            style={{
              color: "#2D5016",
              textShadow: "2px 2px 0px #1A3009",
            }}
          >
            Loading...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="no-print">
        {showAuthDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{
              background: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => {
              setShowAuthDialog(false);
              setAuthError("");
            }}
          >
            <div
              className="pixel-card p-8 max-w-md w-full"
              style={{
                background: "#FFF9C4",
                border: "6px solid #2D5016",
                boxShadow: "12px 12px 0px #1A3009",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className="text-2xl font-bold mb-6 pixel-font text-center"
                style={{
                  color: "#2D5016",
                  textShadow: "2px 2px 0px #1A3009",
                }}
              >
                {user ? "LOGGED IN" : "LOGIN / SIGN UP"}
              </h2>
              {user ? (
                <div className="text-center">
                  <p
                    style={{
                      color: "#1A3009",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    Logged in as: <strong>{user.username}</strong>
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-3 font-bold pixel-button transition-all active:scale-95"
                    style={{
                      background: "#F44336",
                      color: "#FFF",
                      border: "4px solid #2D5016",
                      boxShadow: "4px 4px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      textTransform: "uppercase",
                    }}
                  >
                    LOGOUT
                  </button>
                </div>
              ) : (
                <AuthForm
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                  error={authError}
                />
              )}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    setShowAuthDialog(false);
                    setAuthError("");
                  }}
                  className="px-6 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                  style={{
                    background: "#9E9E9E",
                    color: "#FFF",
                    border: "3px solid #2D5016",
                    boxShadow: "3px 3px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {showAboutDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{
              background: "rgba(0, 0, 0, 0.5)",
            }}
            onClick={() => setShowAboutDialog(false)}
          >
            <div
              className="pixel-card p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              style={{
                background: "#FFF9C4",
                border: "6px solid #2D5016",
                boxShadow: "12px 12px 0px #1A3009",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                className="text-2xl font-bold mb-6 pixel-font text-center"
                style={{
                  color: "#2D5016",
                  textShadow: "2px 2px 0px #1A3009",
                }}
              >
                ABOUT
              </h2>
              <div
                className="space-y-4 text-left"
                style={{
                  color: "#1A3009",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
                <p className="text-center">
                  This is vibecoded by{" "}
                  <a
                    href="https://ianbicking.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#2196F3",
                      textDecoration: "underline",
                    }}
                  >
                    Ian Bicking
                  </a>
                </p>
                <p className="text-center">
                  <a
                    href="https://github.com/ianbicking/trivia-maker"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#2196F3",
                      textDecoration: "underline",
                    }}
                  >
                    View on GitHub
                  </a>
                </p>
                <div
                  className="mt-6 p-4"
                  style={{
                    background: "#E8F5E9",
                    border: "3px solid #2D5016",
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    💾 Data Storage
                  </p>
                  <p>
                    All card data is stored in your local browser. Use the
                    EXPORT button to save or move your cards.
                  </p>
                </div>
                <div
                  className="mt-6 p-4"
                  style={{
                    background: "#E3F2FD",
                    border: "3px solid #2D5016",
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    🤖 OpenRouter AI Integration
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    Trivia Maker can use{" "}
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#2196F3",
                        textDecoration: "underline",
                      }}
                    >
                      OpenRouter.ai
                    </a>{" "}
                    to generate trivia questions using AI.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>What is OpenRouter?</strong> OpenRouter provides
                    access to AI models through a single API. Trivia Maker uses
                    GPT-5.1 to generate questions.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>How it works:</strong>
                  </p>
                  <ul style={{ marginLeft: "20px", marginBottom: "8px" }}>
                    <li>Click "CONNECT OPENROUTER" to authenticate securely</li>
                    <li>
                      The AI sees your existing questions and learns from your
                      feedback
                    </li>
                    <li>
                      Mark questions as "too easy", "too hard", or "other" to
                      improve future generation
                    </li>
                    <li>
                      Your API key is stored locally and never sent to our
                      servers
                    </li>
                  </ul>
                  <p style={{ marginBottom: "8px" }}>
                    <strong>Cost:</strong> You'll need to add money to your
                    OpenRouter account, but you only pay for what you use. You
                    can set limits on how much this app can use. If you use it a
                    lot, it might add up to $1.
                  </p>
                  <p>
                    <strong>Privacy:</strong> All AI requests go directly from
                    your browser to OpenRouter.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAboutDialog(false)}
                  className="px-6 py-3 font-bold pixel-button transition-all active:scale-95"
                  style={{
                    background: "#4CAF50",
                    color: "#FFF",
                    border: "4px solid #2D5016",
                    boxShadow: "4px 4px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    textTransform: "uppercase",
                  }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        {fullScreenMode && fullScreenCard && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
            style={{
              background: "#A8D5BA",
              backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            )`,
            }}
          >
            <div
              className="w-full max-w-4xl flex flex-col h-full"
              style={{
                background: "#FFF9C4",
                border: "6px solid #2D5016",
                boxShadow: "12px 12px 0px #1A3009",
              }}
            >
              {/* Category Header */}
              <div
                className="px-6 py-4 text-center pixel-font text-sm font-bold"
                style={{
                  background: getCategoryColor(fullScreenCard.category, cards)
                    .bg,
                  color: getCategoryColor(fullScreenCard.category, cards).text,
                  borderBottom: "4px solid #2D5016",
                }}
              >
                {(fullScreenCard.category || "Uncategorized").toUpperCase()}
              </div>

              {/* Question */}
              <div className="flex-1 flex items-center justify-center p-12 overflow-auto">
                <div
                  className="text-center leading-relaxed markdown-content"
                  style={{
                    color: "#1A3009",
                    fontFamily: "monospace",
                    fontSize: "32px",
                    lineHeight: "1.8",
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof marked !== "undefined"
                        ? marked.parse(fullScreenCard.question)
                        : fullScreenCard.question.replace(/\n/g, "<br/>"),
                  }}
                />
              </div>

              {/* Answer (shown below question) */}
              {showFullScreenAnswer && (
                <div
                  className="px-12 pb-12 border-t-6"
                  style={{ borderColor: "#2D5016" }}
                >
                  <div
                    className="text-center leading-relaxed markdown-content mt-8"
                    style={{
                      color: "#1A3009",
                      fontFamily: "monospace",
                      fontSize: "28px",
                      lineHeight: "1.8",
                      background: "#C8E6C9",
                      padding: "24px",
                      border: "4px solid #2D5016",
                      boxShadow: "4px 4px 0px #1A3009",
                    }}
                  >
                    <div
                      className="text-xs pixel-font mb-2"
                      style={{ color: "#2D5016" }}
                    >
                      ANSWER:
                    </div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html:
                          typeof marked !== "undefined"
                            ? marked.parse(fullScreenCard.answer)
                            : fullScreenCard.answer.replace(/\n/g, "<br/>"),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div
                className="p-6 flex gap-4 border-t-6"
                style={{ borderColor: "#2D5016", background: "#C8E6C9" }}
              >
                {!showFullScreenAnswer ? (
                  <button
                    onClick={() => setShowFullScreenAnswer(true)}
                    className="flex-1 px-6 py-4 font-bold pixel-button transition-all active:scale-95"
                    style={{
                      background: "#4CAF50",
                      color: "#FFF",
                      border: "4px solid #2D5016",
                      boxShadow: "4px 4px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "18px",
                      textTransform: "uppercase",
                    }}
                  >
                    👁 SHOW ANSWER
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleNextRandomCard}
                      className="flex-1 px-6 py-4 font-bold pixel-button transition-all active:scale-95"
                      style={{
                        background: "#2196F3",
                        color: "#FFF",
                        border: "4px solid #2D5016",
                        boxShadow: "4px 4px 0px #1A3009",
                        fontFamily: "monospace",
                        fontSize: "18px",
                        textTransform: "uppercase",
                      }}
                    >
                      🎲 NEXT RANDOM
                    </button>
                    <button
                      onClick={() => setShowFullScreenAnswer(false)}
                      className="flex-1 px-6 py-4 font-bold pixel-button transition-all active:scale-95"
                      style={{
                        background: "#FFC107",
                        color: "#1A3009",
                        border: "4px solid #2D5016",
                        boxShadow: "4px 4px 0px #1A3009",
                        fontFamily: "monospace",
                        fontSize: "18px",
                        textTransform: "uppercase",
                      }}
                    >
                      🔄 HIDE ANSWER
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseFullScreen}
                  className="px-6 py-4 font-bold pixel-button transition-all active:scale-95"
                  style={{
                    background: "#F44336",
                    color: "#FFF",
                    border: "4px solid #2D5016",
                    boxShadow: "4px 4px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "18px",
                    textTransform: "uppercase",
                  }}
                >
                  ✕ CLOSE
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8 max-w-6xl relative">
          <header className="mb-8 text-center relative">
            <div className="absolute top-0 right-0 flex gap-2">
              <button
                onClick={() => setShowAboutDialog(true)}
                className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                style={{
                  background: "#9E9E9E",
                  color: "#FFF",
                  border: "3px solid #2D5016",
                  boxShadow: "3px 3px 0px #1A3009",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  textTransform: "uppercase",
                }}
              >
                ABOUT
              </button>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                  style={{
                    background: "#F44336",
                    color: "#FFF",
                    border: "3px solid #2D5016",
                    boxShadow: "3px 3px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  LOGOUT
                </button>
              ) : (
                showLoginButton && (
                  <button
                    onClick={() => setShowAuthDialog(true)}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: "#4CAF50",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    LOGIN
                  </button>
                )
              )}
            </div>
            <h1
              className="text-6xl font-bold mb-3 pixel-font"
              style={{
                color: "#E55A3D",
                textShadow: "4px 4px 0px #1A3009, 8px 8px 0px rgba(0,0,0,0.1)",
                letterSpacing: "2px",
              }}
            >
              TRIVIA MAKER
            </h1>
          </header>

          <div
            className="pixel-card p-6 mb-8"
            style={{
              background: "#E8F5E9",
              border: "4px solid #2D5016",
              boxShadow: "8px 8px 0px #1A3009",
            }}
          >
            <h2
              className="text-3xl font-bold mb-5 pixel-font"
              style={{
                color: "#2D5016",
                textShadow: "2px 2px 0px #1A3009",
              }}
            >
              {editingId ? "✎ EDIT CARD" : "➕ NEW CARD"}
            </h2>

            {/* Tabs */}
            {!editingId && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab("manual")}
                  className="px-4 py-2 font-bold pixel-button text-sm"
                  style={{
                    background: activeTab === "manual" ? "#2196F3" : "#E8D5C4",
                    color: activeTab === "manual" ? "#FFF" : "#1A3009",
                    border: "3px solid #2D5016",
                    boxShadow: "3px 3px 0px #1A3009",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  ✏️ MANUAL
                </button>
                {openRouterToken ? (
                  <button
                    onClick={() => setActiveTab("ai")}
                    className="px-4 py-2 font-bold pixel-button text-sm"
                    style={{
                      background: activeTab === "ai" ? "#2196F3" : "#E8D5C4",
                      color: activeTab === "ai" ? "#FFF" : "#1A3009",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    🤖 AI GENERATE
                  </button>
                ) : (
                  <button
                    onClick={handleConnectOpenRouter}
                    className="px-4 py-2 font-bold pixel-button text-sm"
                    style={{
                      background: "#2196F3",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    🔗 CONNECT OPENROUTER
                  </button>
                )}
              </div>
            )}

            {/* Manual Tab */}
            {activeTab === "manual" && (
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-bold mb-2 pixel-font"
                    style={{ color: "#2D5016" }}
                  >
                    QUESTION:
                  </label>
                  <textarea
                    className="w-full px-4 py-3 pixel-input focus:outline-none"
                    rows="3"
                    placeholder="Type your question here... (Markdown supported)"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    style={{
                      background: "#FFF",
                      border: "3px solid #2D5016",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#1A3009",
                      boxShadow: "inset 3px 3px 0px rgba(45, 80, 22, 0.2)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-bold mb-2 pixel-font"
                    style={{ color: "#2D5016" }}
                  >
                    ANSWER:
                  </label>
                  <textarea
                    className="w-full px-4 py-3 pixel-input focus:outline-none"
                    rows="3"
                    placeholder="Type the answer here... (Markdown supported)"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    style={{
                      background: "#FFF",
                      border: "3px solid #2D5016",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#1A3009",
                      boxShadow: "inset 3px 3px 0px rgba(45, 80, 22, 0.2)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-bold mb-2 pixel-font"
                    style={{ color: "#2D5016" }}
                  >
                    CATEGORY:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 pixel-input focus:outline-none"
                      placeholder="Enter or select category..."
                      value={newCategory}
                      onChange={(e) => {
                        setNewCategory(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowCategoryDropdown(false), 200)
                      }
                      style={{
                        background: "#FFF",
                        border: "3px solid #2D5016",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        color: "#1A3009",
                        boxShadow: "inset 3px 3px 0px rgba(45, 80, 22, 0.2)",
                      }}
                    />
                    {showCategoryDropdown && existingCategories.length > 0 && (
                      <div
                        className="absolute z-10 w-full mt-1"
                        style={{
                          background: "#FFF",
                          border: "3px solid #2D5016",
                          boxShadow: "4px 4px 0px #1A3009",
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {existingCategories.map((cat) => (
                          <div
                            key={cat}
                            onClick={() => {
                              setNewCategory(cat);
                              setShowCategoryDropdown(false);
                            }}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 pixel-font text-sm"
                            style={{
                              color: "#1A3009",
                              fontFamily: "monospace",
                            }}
                          >
                            {cat}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {editingId ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="px-6 py-3 font-bold pixel-button transition-all active:scale-95"
                        style={{
                          background: "#4CAF50",
                          color: "#FFF",
                          border: "3px solid #2D5016",
                          boxShadow: "4px 4px 0px #1A3009",
                          fontFamily: "monospace",
                          fontSize: "14px",
                          textTransform: "uppercase",
                        }}
                      >
                        ✓ SAVE
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-3 font-bold pixel-button transition-all active:scale-95"
                        style={{
                          background: "#FFC107",
                          color: "#1A3009",
                          border: "3px solid #2D5016",
                          boxShadow: "4px 4px 0px #1A3009",
                          fontFamily: "monospace",
                          fontSize: "14px",
                          textTransform: "uppercase",
                        }}
                      >
                        ✗ CANCEL
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddCard}
                      className="px-6 py-3 font-bold pixel-button transition-all active:scale-95"
                      style={{
                        background: "#2196F3",
                        color: "#FFF",
                        border: "3px solid #2D5016",
                        boxShadow: "4px 4px 0px #1A3009",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        textTransform: "uppercase",
                      }}
                    >
                      + ADD CARD
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI Tab */}
            {activeTab === "ai" && !editingId && (
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-bold mb-2 pixel-font"
                    style={{ color: "#2D5016" }}
                  >
                    CATEGORY:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 pixel-input focus:outline-none"
                      placeholder="Enter or select category..."
                      value={aiCategory}
                      onChange={(e) => {
                        setAiCategory(e.target.value);
                        setShowAiCategoryDropdown(true);
                      }}
                      onFocus={() => setShowAiCategoryDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowAiCategoryDropdown(false), 200)
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !isGenerating) {
                          handleGenerateQuestions();
                        }
                      }}
                      style={{
                        background: "#FFF",
                        border: "3px solid #2D5016",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        color: "#1A3009",
                        boxShadow: "inset 3px 3px 0px rgba(45, 80, 22, 0.2)",
                      }}
                    />
                    {showAiCategoryDropdown &&
                      existingCategories.length > 0 && (
                        <div
                          className="absolute z-10 w-full mt-1"
                          style={{
                            background: "#FFF",
                            border: "3px solid #2D5016",
                            boxShadow: "4px 4px 0px #1A3009",
                            maxHeight: "200px",
                            overflowY: "auto",
                          }}
                        >
                          {existingCategories
                            .filter((cat) =>
                              aiCategory.trim()
                                ? cat
                                    .toLowerCase()
                                    .includes(aiCategory.toLowerCase())
                                : true
                            )
                            .map((cat) => (
                              <div
                                key={cat}
                                onClick={() => {
                                  setAiCategory(cat);
                                  setShowAiCategoryDropdown(false);
                                }}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 pixel-font text-sm"
                                style={{
                                  color: "#1A3009",
                                  fontFamily: "monospace",
                                }}
                              >
                                {cat}
                              </div>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm font-bold mb-2 pixel-font"
                    style={{ color: "#2D5016" }}
                  >
                    INPUT (OPTIONAL):
                  </label>
                  <textarea
                    className="w-full px-4 py-3 pixel-input focus:outline-none"
                    rows="2"
                    placeholder="Any additional instructions or feedback for the AI..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    style={{
                      background: "#FFF",
                      border: "3px solid #2D5016",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      color: "#1A3009",
                      boxShadow: "inset 3px 3px 0px rgba(45, 80, 22, 0.2)",
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating || !aiCategory.trim()}
                    className="px-6 py-3 font-bold pixel-button transition-all active:scale-95 flex-1"
                    style={{
                      background:
                        isGenerating || !aiCategory.trim()
                          ? "#9E9E9E"
                          : "#9C27B0",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "4px 4px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      textTransform: "uppercase",
                      cursor:
                        isGenerating || !aiCategory.trim()
                          ? "not-allowed"
                          : "pointer",
                      opacity: isGenerating || !aiCategory.trim() ? 0.6 : 1,
                    }}
                  >
                    {isGenerating
                      ? `⏳ GENERATING... (${generationElapsed}s${
                          longestGenerationTime > 0
                            ? `/${longestGenerationTime}s`
                            : ""
                        })`
                      : "✨ GENERATE QUESTIONS"}
                  </button>
                  {(
                    rejectedQuestions[aiCategory.trim() || "Uncategorized"] ||
                    []
                  ).length > 0 && (
                    <button
                      onClick={handleClearFeedback}
                      className="px-4 py-3 font-bold pixel-button transition-all active:scale-95"
                      style={{
                        background: "#FF9800",
                        color: "#FFF",
                        border: "3px solid #2D5016",
                        boxShadow: "4px 4px 0px #1A3009",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      🗑 CLEAR FEEDBACK
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "This will remove your OpenRouter connection and you will need to reconnect to use AI generation. Continue?"
                        )
                      ) {
                        handleRemoveToken();
                        setActiveTab("manual");
                      }
                    }}
                    className="px-4 py-3 font-bold pixel-button transition-all active:scale-95"
                    style={{
                      background: "#F44336",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "4px 4px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    REMOVE KEY
                  </button>
                </div>

                {generatedQuestions.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3
                      className="text-xl font-bold pixel-font"
                      style={{ color: "#2D5016" }}
                    >
                      GENERATED QUESTIONS ({generatedQuestions.length}):
                    </h3>
                    {generatedQuestions.map((item, index) => (
                      <div
                        key={index}
                        className="p-4"
                        style={{
                          background: "#FFF9C4",
                          border: "3px solid #2D5016",
                          boxShadow: "3px 3px 0px #1A3009",
                          transition: "all 0.3s ease",
                          opacity: keepingCardIndex === index ? 0 : 1,
                          transform:
                            keepingCardIndex === index
                              ? "scale(0.8) translateY(-20px)"
                              : "scale(1) translateY(0)",
                        }}
                      >
                        <div className="mb-3">
                          <div
                            className="text-sm font-bold pixel-font mb-1"
                            style={{ color: "#2D5016" }}
                          >
                            Q:
                          </div>
                          <div
                            className="text-sm markdown-content"
                            style={{
                              color: "#1A3009",
                              fontFamily: "monospace",
                              marginBottom: "8px",
                            }}
                            dangerouslySetInnerHTML={{
                              __html:
                                typeof marked !== "undefined"
                                  ? marked.parse(item.question || "")
                                  : (item.question || "").replace(
                                      /\n/g,
                                      "<br/>"
                                    ),
                            }}
                          />
                        </div>
                        <div className="mb-3">
                          <div
                            className="text-sm font-bold pixel-font mb-1"
                            style={{ color: "#2D5016" }}
                          >
                            A:
                          </div>
                          <div
                            className="text-sm markdown-content"
                            style={{
                              color: "#1A3009",
                              fontFamily: "monospace",
                            }}
                            dangerouslySetInnerHTML={{
                              __html:
                                typeof marked !== "undefined"
                                  ? marked.parse(item.answer || "")
                                  : (item.answer || "").replace(/\n/g, "<br/>"),
                            }}
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              handleRejectQuestion(
                                item.question,
                                item.answer,
                                index,
                                "too-easy"
                              )
                            }
                            className="flex-1 min-w-[80px] px-2 py-2 font-bold pixel-button text-xs"
                            style={{
                              background: "#FF9800",
                              color: "#FFF",
                              border: "2px solid #2D5016",
                              boxShadow: "2px 2px 0px #1A3009",
                              fontFamily: "monospace",
                              textTransform: "uppercase",
                            }}
                          >
                            TOO EASY
                          </button>
                          <button
                            onClick={() =>
                              handleRejectQuestion(
                                item.question,
                                item.answer,
                                index,
                                "too-hard"
                              )
                            }
                            className="flex-1 min-w-[80px] px-2 py-2 font-bold pixel-button text-xs"
                            style={{
                              background: "#9C27B0",
                              color: "#FFF",
                              border: "2px solid #2D5016",
                              boxShadow: "2px 2px 0px #1A3009",
                              fontFamily: "monospace",
                              textTransform: "uppercase",
                            }}
                          >
                            TOO HARD
                          </button>
                          <button
                            onClick={() =>
                              handleRejectQuestion(
                                item.question,
                                item.answer,
                                index,
                                "other"
                              )
                            }
                            className="flex-1 min-w-[80px] px-2 py-2 font-bold pixel-button text-xs"
                            style={{
                              background: "#2196F3",
                              color: "#FFF",
                              border: "2px solid #2D5016",
                              boxShadow: "2px 2px 0px #1A3009",
                              fontFamily: "monospace",
                              textTransform: "uppercase",
                            }}
                          >
                            👎 OTHER
                          </button>
                          <button
                            onClick={() =>
                              handleKeepQuestion(
                                item.question,
                                item.answer,
                                index
                              )
                            }
                            className="flex-1 min-w-[80px] px-2 py-2 font-bold pixel-button text-xs"
                            style={{
                              background: "#4CAF50",
                              color: "#FFF",
                              border: "2px solid #2D5016",
                              boxShadow: "2px 2px 0px #1A3009",
                              fontFamily: "monospace",
                              textTransform: "uppercase",
                            }}
                          >
                            ✓ KEEP
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {cards.length === 0 ? (
            <div
              className="pixel-card p-12 text-center"
              style={{
                background: "#E8F5E9",
                border: "4px solid #2D5016",
                boxShadow: "8px 8px 0px #1A3009",
              }}
            >
              <p className="text-xl pixel-font" style={{ color: "#4A7C2A" }}>
                ⚠ NO CARDS YET ⚠
              </p>
              <p
                className="text-sm pixel-font mt-2"
                style={{ color: "#4A7C2A" }}
              >
                Create your first card above!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="mb-3">
                  <h2
                    className="text-3xl font-bold pixel-font"
                    style={{
                      color: "#2D5016",
                      textShadow: "2px 2px 0px #1A3009",
                    }}
                  >
                    CARDS: {cards.length}
                    {selectedCards.size > 0 && (
                      <span
                        className="text-lg ml-2"
                        style={{ color: "#4A7C2A" }}
                      >
                        ({selectedCards.size} selected)
                      </span>
                    )}
                  </h2>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "table" : "grid")
                    }
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: "#673AB7",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    {viewMode === "grid" ? "📋 TABLE VIEW" : "🎴 CARD VIEW"}
                  </button>
                  <button
                    onClick={handleSelectAll}
                    disabled={cards.length === 0}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: cards.length === 0 ? "#9E9E9E" : "#607D8B",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      cursor: cards.length === 0 ? "not-allowed" : "pointer",
                      opacity: cards.length === 0 ? 0.6 : 1,
                    }}
                  >
                    {selectedCards.size === cards.length
                      ? "☐ DESELECT ALL"
                      : "☑ SELECT ALL"}
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={selectedCards.size === 0}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background:
                        selectedCards.size === 0 ? "#9E9E9E" : "#795548",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      cursor:
                        selectedCards.size === 0 ? "not-allowed" : "pointer",
                      opacity: selectedCards.size === 0 ? 0.6 : 1,
                    }}
                  >
                    🖨 PRINT
                  </button>
                  <button
                    onClick={handleOpenFullScreen}
                    disabled={cards.length === 0}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: cards.length === 0 ? "#9E9E9E" : "#00BCD4",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      cursor: cards.length === 0 ? "not-allowed" : "pointer",
                      opacity: cards.length === 0 ? 0.6 : 1,
                    }}
                  >
                    🎲 FULL SCREEN
                  </button>
                  <label
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm cursor-pointer"
                    style={{
                      background: "#9C27B0",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    📥 IMPORT
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportCards}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    onClick={handleExportCards}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: "#FF9800",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    📤 EXPORT
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete all cards?")) {
                        setCards([]);
                        setFlippedCards(new Set());
                      }
                    }}
                    className="px-4 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
                    style={{
                      background: "#F44336",
                      color: "#FFF",
                      border: "3px solid #2D5016",
                      boxShadow: "3px 3px 0px #1A3009",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    🗑 CLEAR ALL
                  </button>
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card) => (
                    <TriviaCard
                      key={card.id}
                      card={card}
                      allCards={cards}
                      isFlipped={flippedCards.has(card.id)}
                      onFlip={() => toggleFlip(card.id)}
                      onEdit={() => handleStartEdit(card.id)}
                      onDelete={() => handleDeleteCard(card.id)}
                      isSelected={selectedCards.has(card.id)}
                      onToggleSelect={() => handleToggleCardSelection(card.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="overflow-x-auto"
                  style={{
                    background: "#E8F5E9",
                    border: "4px solid #2D5016",
                    boxShadow: "8px 8px 0px #1A3009",
                  }}
                >
                  <table
                    className="w-full"
                    style={{
                      fontFamily: "sans-serif",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#2D5016",
                          color: "#FFF",
                        }}
                      >
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            border: "2px solid #1A3009",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          ☑
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            border: "2px solid #1A3009",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            border: "2px solid #1A3009",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          Question
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            border: "2px solid #1A3009",
                            fontWeight: "bold",
                            fontSize: "14px",
                            width: "30%",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>Answer</span>
                            <button
                              onClick={() =>
                                setShowAnswersInTable(!showAnswersInTable)
                              }
                              className="px-2 py-1 font-bold pixel-button transition-all active:scale-95 text-xs"
                              style={{
                                background: showAnswersInTable
                                  ? "#4CAF50"
                                  : "#9E9E9E",
                                color: "#FFF",
                                border: "2px solid #FFF",
                                boxShadow: "2px 2px 0px #1A3009",
                                fontFamily: "monospace",
                                fontSize: "10px",
                                textTransform: "uppercase",
                              }}
                            >
                              {showAnswersInTable ? "👁 HIDE" : "👁 SHOW"}
                            </button>
                          </div>
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            border: "2px solid #1A3009",
                            fontWeight: "bold",
                            fontSize: "14px",
                            width: "100px",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map((card, index) => {
                        const categoryColor = getCategoryColor(
                          card.category,
                          cards
                        );
                        return (
                          <tr
                            key={card.id}
                            style={{
                              background: index % 2 === 0 ? "#FFF" : "#F5F5F5",
                              borderBottom: "1px solid #2D5016",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px",
                                border: "1px solid #2D5016",
                                textAlign: "center",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedCards.has(card.id)}
                                onChange={() =>
                                  handleToggleCardSelection(card.id)
                                }
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                  accentColor: "#2196F3",
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                border: "1px solid #2D5016",
                                fontWeight: "bold",
                                fontSize: "12px",
                                background: categoryColor.bg,
                                color: categoryColor.text,
                              }}
                            >
                              {card.category || "Uncategorized"}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                border: "1px solid #2D5016",
                                fontSize: "14px",
                                color: "#1A3009",
                              }}
                            >
                              <div
                                className="markdown-content"
                                style={{
                                  fontFamily: "sans-serif",
                                }}
                                dangerouslySetInnerHTML={{
                                  __html:
                                    typeof marked !== "undefined"
                                      ? marked.parse(card.question)
                                      : card.question.replace(/\n/g, "<br/>"),
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                border: "1px solid #2D5016",
                                fontSize: "14px",
                                color: "#1A3009",
                                width: "30%",
                              }}
                            >
                              {showAnswersInTable ? (
                                <div
                                  className="markdown-content"
                                  style={{
                                    fontFamily: "sans-serif",
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      typeof marked !== "undefined"
                                        ? marked.parse(card.answer)
                                        : card.answer.replace(/\n/g, "<br/>"),
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    fontFamily: "sans-serif",
                                    color: "#757575",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {countWords(card.answer)} words
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #2D5016",
                                textAlign: "center",
                              }}
                            >
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => handleStartEdit(card.id)}
                                  className="px-3 py-1 font-bold transition-all active:scale-95 text-xs"
                                  style={{
                                    background: "#FFC107",
                                    color: "#1A3009",
                                    border: "2px solid #2D5016",
                                    boxShadow: "2px 2px 0px #1A3009",
                                    fontFamily: "sans-serif",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✎ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCard(card.id)}
                                  className="px-3 py-1 font-bold transition-all active:scale-95 text-xs"
                                  style={{
                                    background: "#F44336",
                                    color: "#FFF",
                                    border: "2px solid #2D5016",
                                    boxShadow: "2px 2px 0px #1A3009",
                                    fontFamily: "sans-serif",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Print View - Must be outside no-print div */}
      <div
        className="print-view"
        style={{ display: printMode ? "block" : "none" }}
      >
        {(() => {
          const selectedCardsList = cards.filter((card) =>
            selectedCards.has(card.id)
          );
          const numPages = Math.ceil(selectedCardsList.length / 6);

          // Interleave questions and answers: Q1, A1, Q2, A2, etc.
          const pages = [];
          for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
            const startIndex = pageIndex * 6;
            const pageCards = selectedCardsList.slice(
              startIndex,
              startIndex + 6
            );

            // Question page
            pages.push(
              <div
                key={`questions-${pageIndex}`}
                className="print-page print-questions"
              >
                <div className="print-grid">
                  {pageCards.map((card) => (
                    <div
                      key={card.id}
                      className="print-card print-card-question"
                    >
                      <div
                        className="print-category"
                        style={{
                          background: getCategoryColor(card.category, cards).bg,
                          color: getCategoryColor(card.category, cards).text,
                        }}
                      >
                        {(card.category || "Uncategorized").toUpperCase()}
                      </div>
                      <div className="print-content">
                        <div
                          className="markdown-content"
                          dangerouslySetInnerHTML={{
                            __html:
                              typeof marked !== "undefined"
                                ? marked.parse(card.question)
                                : card.question.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );

            // Answer page (immediately after question page)
            pages.push(
              <div
                key={`answers-${pageIndex}`}
                className="print-page print-answers"
              >
                <div className="print-grid">
                  {pageCards.map((card) => (
                    <div key={card.id} className="print-card print-card-answer">
                      <div className="print-answer-header">ANSWER</div>
                      <div className="print-content">
                        <div
                          className="markdown-content"
                          dangerouslySetInnerHTML={{
                            __html:
                              typeof marked !== "undefined"
                                ? marked.parse(card.answer)
                                : card.answer.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return pages;
        })()}
      </div>
    </React.Fragment>
  );
}

// Helper function to generate a consistent color for a category
// Categories are sorted alphabetically and assigned colors in order
function getCategoryColor(category, allCards) {
  if (!category) return { bg: "#6B7280", text: "#FFF" }; // gray-500

  // Get all unique categories, sorted alphabetically
  const allCategories = Array.from(
    new Set(allCards.map((c) => c.category || "Uncategorized").filter(Boolean))
  ).sort();

  // Find the index of this category in the sorted list
  const categoryIndex = allCategories.indexOf(category || "Uncategorized");

  // Tailwind color palette - diverse, distinct colors for good visual separation
  const tailwindColors = [
    { bg: "#2563EB", text: "#FFF" }, // blue-600
    { bg: "#16A34A", text: "#FFF" }, // green-600
    { bg: "#DC2626", text: "#FFF" }, // red-600
    { bg: "#9333EA", text: "#FFF" }, // purple-600
    { bg: "#EA580C", text: "#FFF" }, // orange-600
    { bg: "#0891B2", text: "#FFF" }, // cyan-600
    { bg: "#DB2777", text: "#FFF" }, // pink-600
    { bg: "#059669", text: "#FFF" }, // emerald-600
    { bg: "#7C3AED", text: "#FFF" }, // violet-600
    { bg: "#CA8A04", text: "#FFF" }, // yellow-600
    { bg: "#0D9488", text: "#FFF" }, // teal-600
    { bg: "#C026D3", text: "#FFF" }, // fuchsia-600
    { bg: "#65A30D", text: "#FFF" }, // lime-600
    { bg: "#0284C7", text: "#FFF" }, // sky-600
    { bg: "#D97706", text: "#FFF" }, // amber-600
    { bg: "#E11D48", text: "#FFF" }, // rose-600
  ];

  // Wrap around if there are more categories than colors
  const colorIndex = categoryIndex % tailwindColors.length;
  return tailwindColors[colorIndex];
}

function TriviaCard({
  card,
  allCards,
  isFlipped,
  onFlip,
  onEdit,
  onDelete,
  isSelected,
  onToggleSelect,
}) {
  const categoryColor = getCategoryColor(card.category, allCards);
  const category = card.category || "Uncategorized";

  return (
    <div
      className="pixel-card overflow-hidden relative"
      style={{
        background: "#E8F5E9",
        border: "4px solid #2D5016",
        boxShadow: "6px 6px 0px #1A3009",
        transition: "transform 0.1s, box-shadow 0.1s",
        outline: isSelected ? "4px solid #2196F3" : "none",
        outlineOffset: "2px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "8px 8px 0px #1A3009";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "6px 6px 0px #1A3009";
      }}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 right-2 z-10" style={{ zIndex: 10 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-5 h-5 cursor-pointer"
          style={{
            width: "20px",
            height: "20px",
            cursor: "pointer",
            accentColor: "#2196F3",
          }}
        />
      </div>
      <div className="relative h-80" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Question side */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div
              className="h-full flex flex-col"
              style={{
                background: "#FFF9C4",
              }}
            >
              {/* Category Header */}
              <div
                className="px-3 py-2 text-center pixel-font text-xs font-bold"
                style={{
                  background: categoryColor.bg,
                  color: categoryColor.text,
                  borderBottom: "3px solid #2D5016",
                }}
              >
                {category.toUpperCase()}
              </div>
              <div className="flex-1 flex items-center justify-center overflow-auto p-5">
                <div
                  className="text-base text-center leading-relaxed markdown-content"
                  style={{
                    color: "#1A3009",
                    fontFamily: "monospace",
                    fontSize: "16px",
                    lineHeight: "1.6",
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof marked !== "undefined"
                        ? marked.parse(card.question)
                        : card.question.replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
              <div
                className="mt-auto pt-3 border-t-4"
                style={{ borderColor: "#2D5016" }}
              >
                <button
                  onClick={onFlip}
                  className="w-full px-4 py-2.5 font-bold pixel-button transition-all active:scale-95"
                  style={{
                    background: "#2196F3",
                    color: "#FFF",
                    border: "3px solid #2D5016",
                    boxShadow: "3px 3px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  👁 SHOW ANSWER
                </button>
              </div>
            </div>
          </div>
          {/* Answer side */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div
              className="h-full flex flex-col"
              style={{
                background: "#C8E6C9",
              }}
            >
              {/* Category Header */}
              <div
                className="px-3 py-2 text-center pixel-font text-xs font-bold"
                style={{
                  background: categoryColor.bg,
                  color: categoryColor.text,
                  borderBottom: "3px solid #2D5016",
                }}
              >
                {category.toUpperCase()}
              </div>
              <div className="flex-1 flex items-center justify-center overflow-auto p-5">
                <div
                  className="text-base text-center leading-relaxed markdown-content"
                  style={{
                    color: "#1A3009",
                    fontFamily: "monospace",
                    fontSize: "16px",
                    lineHeight: "1.6",
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof marked !== "undefined"
                        ? marked.parse(card.answer)
                        : card.answer.replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
              <div
                className="mt-auto pt-3 border-t-4"
                style={{ borderColor: "#2D5016" }}
              >
                <button
                  onClick={onFlip}
                  className="w-full px-4 py-2.5 font-bold pixel-button transition-all active:scale-95 mb-2"
                  style={{
                    background: "#FFC107",
                    color: "#1A3009",
                    border: "3px solid #2D5016",
                    boxShadow: "3px 3px 0px #1A3009",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  ← BACK
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="p-3 flex gap-2"
        style={{
          background: "#C8E6C9",
          borderTop: "4px solid #2D5016",
        }}
      >
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
          style={{
            background: "#FFC107",
            color: "#1A3009",
            border: "3px solid #2D5016",
            boxShadow: "2px 2px 0px #1A3009",
            fontFamily: "monospace",
            fontSize: "11px",
            textTransform: "uppercase",
          }}
        >
          ✎ EDIT
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-2 font-bold pixel-button transition-all active:scale-95 text-sm"
          style={{
            background: "#F44336",
            color: "#FFF",
            border: "3px solid #2D5016",
            boxShadow: "2px 2px 0px #1A3009",
            fontFamily: "monospace",
            fontSize: "11px",
            textTransform: "uppercase",
          }}
        >
          🗑 DELETE
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TriviaMaker />);
