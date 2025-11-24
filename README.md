# Trivia Maker

A simple, fun trivia card maker for creating and managing your own trivia questions. Perfect for family game nights, parties, or educational activities.

🌐 **Live at:** [trivia.ianbicking.org](https://trivia.ianbicking.org)

## About

I made this for some family fun, and I hope you might have your own fun with it too! Categories don't have to have the same difficulty, so you can make cards for the kids in one category, and harder cards for other folks.

## Features

- Create trivia cards manually or with AI assistance
- Organize cards by category with color-coded headers
- Export and import your cards as JSON
- Print cards for double-sided printing (6 cards per page)
- Full-screen random question mode
- All data stored locally in your browser

## Setup

There's no build process! The page is in `docs/` for use with GitHub Pages.

To run locally:

1. Serve the `docs/` directory with any HTTP server
2. Open the page in your browser

For example:

```bash
cd docs
python -m http.server 8000
# Then open http://localhost:8000
```

## OpenRouter Integration

Trivia Maker can use [OpenRouter.ai](https://openrouter.ai) to generate trivia questions using AI. Here's how it works:

### What is OpenRouter?

OpenRouter is a service that provides access to AI models through a single API. Trivia Maker uses GPT-5.1 to generate questions.

### How It Works in Trivia Maker

1. **Connect Your Account**: Click "CONNECT OPENROUTER" to authenticate with OpenRouter using OAuth. This is a secure way to connect without sharing your API key directly.

2. **Generate Questions**: Once connected, you can:

   - Enter a category for your questions
   - Provide additional instructions or feedback
   - Click "GENERATE" to create new trivia questions

3. **AI Learning**: The AI will:

   - See all your existing questions in the category
   - Learn from your feedback (marking questions as "too easy", "too hard", or "format" issues)
   - Use your feedback to generate better questions over time

4. **Cost**: You'll need to add money to your OpenRouter account, but you only pay for what you use. You can set limits on how much this app can use. If you use it a lot, it might add up to $1.

5. **Privacy**: Your OpenRouter API key is stored locally in your browser. It's never sent to our servers (we don't have any servers!). All AI requests go directly from your browser to OpenRouter.

6. **Removing Connection**: You can remove your OpenRouter connection at any time by clicking "REMOVE" in the AI generation tab.

### Why Use OpenRouter?

- **No API Key Management**: OAuth handles authentication securely
- **Pay-as-you-go**: You only pay for what you use, with the ability to set spending limits
- **Privacy**: Your data stays in your browser

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

- Notification sound: [ding.wav](https://freesound.org/people/tim.kahn/sounds/91926/) by tim.kahn, used under [CC Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
