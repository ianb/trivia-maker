const { useState, useEffect } = React;

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
  const [keepingCardIndex, setKeepingCardIndex] = useState(null);
  const [rejectedQuestions, setRejectedQuestions] = useState({}); // { category: [{question, answer, annotation}] }
  const [fullScreenMode, setFullScreenMode] = useState(false);
  const [fullScreenCard, setFullScreenCard] = useState(null);
  const [showFullScreenAnswer, setShowFullScreenAnswer] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [printMode, setPrintMode] = useState(false);

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

    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
        .map((card) => `${card.question}: ${card.answer}`)
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
      const formatRejected = categoryRejected.filter(
        (r) => r.annotation === "format"
      );

      let rejectedText = "";

      if (tooEasyRejected.length > 0) {
        const tooEasyText = tooEasyRejected
          .map(
            (rejected) =>
              `<feedback user-feedback="${(rejected.userFeedback || "").replace(
                /"/g,
                "&quot;"
              )}">${rejected.question}: ${rejected.answer}</feedback>`
          )
          .join("\n\n");
        rejectedText += `Questions marked as too easy:\n${tooEasyText}\n\n`;
      }

      if (tooHardRejected.length > 0) {
        const tooHardText = tooHardRejected
          .map(
            (rejected) =>
              `<feedback user-feedback="${(rejected.userFeedback || "").replace(
                /"/g,
                "&quot;"
              )}">${rejected.question}: ${rejected.answer}</feedback>`
          )
          .join("\n\n");
        rejectedText += `Questions marked as too hard:\n${tooHardText}\n\n`;
      }

      if (formatRejected.length > 0) {
        const formatText = formatRejected
          .map(
            (rejected) =>
              `<feedback user-feedback="${(rejected.userFeedback || "").replace(
                /"/g,
                "&quot;"
              )}">${rejected.question}: ${rejected.answer}</feedback>`
          )
          .join("\n\n");
        rejectedText += `Questions with format issues:\n${formatText}\n\n`;
      }

      // Build the prompt
      let prompt = `<category>\n${aiCategory}\n</category>\n\nGenerate 5 trivia questions about this category.\n\n`;

      if (existingQuestionsText) {
        prompt += `Here are the existing questions in this category (try to make new kinds of questions different than these):\n${existingQuestionsText}\n\n`;
      }

      if (rejectedText) {
        prompt += `Here are some questions that were rejected with feedback:\n${rejectedText}`;
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
                    },
                    required: ["question", "answer"],
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
            content: `You are a trivia question generator. You are making questions with compact questions and a canonical answer. Answers should be short and clear (though you may include an explanation in parenthesis if there are multiple possible answers)\n\nQuestions and answers may include Markdown formatting and emoji, but make them easy to read out loud.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        reasoning: {
          effort: "high",
          exclude: true,
          enabled: true,
        },
      };

      console.log("LLM User Message:", prompt);

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

      // Parse the structured JSON response
      let questions = [];
      try {
        const parsed = JSON.parse(content);
        console.log(
          "LLM Structured Response:",
          JSON.stringify(parsed, null, 2)
        );

        // Extract questions from the structured response
        if (parsed.questions && Array.isArray(parsed.questions)) {
          questions = parsed.questions;
        } else if (Array.isArray(parsed)) {
          // Fallback: if it's directly an array
          questions = parsed;
        } else {
          throw new Error("Response does not contain a questions array");
        }
      } catch (parseError) {
        console.error("Failed to parse structured response:", parseError);
        console.error("Raw content:", content);
        alert("Failed to parse AI response. Please try again.");
        setIsGenerating(false);
        return;
      }

      setGeneratedQuestions(questions);
    } catch (error) {
      console.error("Error generating questions:", error);
      alert(`Failed to generate questions: ${error.message}`);
    } finally {
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
      format:
        "What format issue does this question have? (e.g., poor question length, ambiguous answer, answer revealed in question)",
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

  return (
    <React.Fragment>
      <div className="no-print">
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
          {/* OpenRouter Button - Top Right */}
          <div className="absolute top-0 right-0">
            {openRouterToken ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-xs pixel-font px-3 py-2"
                  style={{
                    color: "#4CAF50",
                    background: "#E8F5E9",
                    border: "2px solid #2D5016",
                    boxShadow: "2px 2px 0px #1A3009",
                  }}
                >
                  ✓ CONNECTED
                </span>
                <button
                  onClick={handleRemoveToken}
                  className="px-3 py-2 font-bold pixel-button text-xs"
                  style={{
                    background: "#F44336",
                    color: "#FFF",
                    border: "2px solid #2D5016",
                    boxShadow: "2px 2px 0px #1A3009",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectOpenRouter}
                className="px-4 py-2 font-bold pixel-button text-xs"
                style={{
                  background: "#2196F3",
                  color: "#FFF",
                  border: "2px solid #2D5016",
                  boxShadow: "2px 2px 0px #1A3009",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              >
                🔗 CONNECT OPENROUTER
              </button>
            )}
          </div>

          <header className="mb-8 text-center">
            <h1
              className="text-6xl font-bold mb-3 pixel-font"
              style={{
                color: "#2D5016",
                textShadow: "4px 4px 0px #1A3009, 8px 8px 0px rgba(0,0,0,0.1)",
                letterSpacing: "2px",
              }}
            >
              TRIVIA MAKER
            </h1>
            <p className="text-xl pixel-font mb-4" style={{ color: "#4A7C2A" }}>
              ▓▓▓ CREATE CARDS ▓▓▓
            </p>
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
            {!editingId && openRouterToken && (
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
                      ? "⏳ GENERATING..."
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
                            ⬇ EASIER
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
                            ⬆ HARDER
                          </button>
                          <button
                            onClick={() =>
                              handleRejectQuestion(
                                item.question,
                                item.answer,
                                index,
                                "format"
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
                            📝 FORMAT
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
              <div className="mb-6 flex justify-between items-center">
                <h2
                  className="text-3xl font-bold pixel-font"
                  style={{
                    color: "#2D5016",
                    textShadow: "2px 2px 0px #1A3009",
                  }}
                >
                  CARDS: {cards.length}
                  {selectedCards.size > 0 && (
                    <span className="text-lg ml-2" style={{ color: "#4A7C2A" }}>
                      ({selectedCards.size} selected)
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
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
