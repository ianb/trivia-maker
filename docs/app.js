const { useState, useEffect } = React;

function TriviaMaker() {
  const [cards, setCards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [openRouterToken, setOpenRouterToken] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [aiCategory, setAiCategory] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keepingCardIndex, setKeepingCardIndex] = useState(null);
  const [rejectedQuestions, setRejectedQuestions] = useState({}); // { category: [{question, answer, annotation}] }

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

          if (
            confirm(
              `Import ${importedCards.length} card(s)? This will add them to your existing cards.`
            )
          ) {
            setCards([...cards, ...importedCards]);
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
      const rejectedText = categoryRejected
        .map((rejected) => {
          const tag =
            rejected.annotation === "too-easy" ? "<too-easy>" : "<too-hard>";
          return `${tag}\n${rejected.question}: ${rejected.answer}\n</${rejected.annotation}>`;
        })
        .join("\n\n");

      // Build the prompt
      let prompt = `Generate 5 trivia questions about "${aiCategory}".\n\n`;

      if (existingQuestionsText) {
        prompt += `Here are the existing questions in this category (try to make new kinds of questions different than these):\n${existingQuestionsText}\n\n`;
      }

      if (rejectedText) {
        prompt += `Here are some questions that were rejected with feedback:\n${rejectedText}\n\n`;
        prompt += `You may generate a similar question to those that were rejected, so long as you incorporate the feedback.\n\n`;
      }

      if (aiInput.trim()) {
        prompt += `Additional instructions: ${aiInput.trim()}\n\n`;
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
            content: `You are a trivia question generator. You are making questions with compact questions and a canonical answer. Answers should be short and clear (though you may include an explanation in parenthesis if there are multiple possible answers)`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      };

      console.log("LLM Request:", JSON.stringify(requestBody, null, 2));

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
          },
        ],
      };
    });
    // Remove the question from the generated list
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClearFeedback() {
    const categoryKey = aiCategory.trim() || "Uncategorized";
    setRejectedQuestions((prev) => {
      const updated = { ...prev };
      delete updated[categoryKey];
      return updated;
    });
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
              <input
                type="text"
                className="w-full px-4 py-3 pixel-input focus:outline-none"
                placeholder="e.g., World History, Science, Pop Culture..."
                value={aiCategory}
                onChange={(e) => setAiCategory(e.target.value)}
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
                    isGenerating || !aiCategory.trim() ? "#9E9E9E" : "#9C27B0",
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
                {isGenerating ? "⏳ GENERATING..." : "✨ GENERATE QUESTIONS"}
              </button>
              {(rejectedQuestions[aiCategory.trim() || "Uncategorized"] || [])
                .length > 0 && (
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
                              : (item.question || "").replace(/\n/g, "<br/>"),
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
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleRejectQuestion(
                            item.question,
                            item.answer,
                            index,
                            "too-easy"
                          )
                        }
                        className="flex-1 px-3 py-2 font-bold pixel-button text-xs"
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
                        className="flex-1 px-3 py-2 font-bold pixel-button text-xs"
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
                          handleKeepQuestion(item.question, item.answer, index)
                        }
                        className="flex-1 px-3 py-2 font-bold pixel-button text-xs"
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
          <p className="text-sm pixel-font mt-2" style={{ color: "#4A7C2A" }}>
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
            </h2>
            <div className="flex gap-2">
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
                isFlipped={flippedCards.has(card.id)}
                onFlip={() => toggleFlip(card.id)}
                onEdit={() => handleStartEdit(card.id)}
                onDelete={() => handleDeleteCard(card.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to generate a consistent color for a category
function getCategoryColor(category) {
  if (!category) return { bg: "#9E9E9E", text: "#FFF" };

  // Generate a hash from the category string
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate a color palette with good contrast
  const colors = [
    { bg: "#8B4513", text: "#FFF" }, // Brown
    { bg: "#4A148C", text: "#FFF" }, // Purple
    { bg: "#00695C", text: "#FFF" }, // Teal
    { bg: "#B71C1C", text: "#FFF" }, // Red
    { bg: "#0D47A1", text: "#FFF" }, // Blue
    { bg: "#1B5E20", text: "#FFF" }, // Green
    { bg: "#E65100", text: "#FFF" }, // Orange
    { bg: "#4A148C", text: "#FFF" }, // Deep Purple
    { bg: "#880E4F", text: "#FFF" }, // Pink
    { bg: "#1A237E", text: "#FFF" }, // Indigo
    { bg: "#BF360C", text: "#FFF" }, // Deep Orange
    { bg: "#004D40", text: "#FFF" }, // Dark Teal
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function TriviaCard({ card, isFlipped, onFlip, onEdit, onDelete }) {
  const categoryColor = getCategoryColor(card.category);
  const category = card.category || "Uncategorized";

  return (
    <div
      className="pixel-card overflow-hidden"
      style={{
        background: "#E8F5E9",
        border: "4px solid #2D5016",
        boxShadow: "6px 6px 0px #1A3009",
        transition: "transform 0.1s, box-shadow 0.1s",
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
      <div className="relative h-56" style={{ perspective: "1000px" }}>
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
