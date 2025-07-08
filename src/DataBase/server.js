const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3001;
const OLLAMA_URL = "http://localhost:11434";

app.use(cors());
app.use(express.json());

app.get("/models", async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const models = response.data.models.map((m) => m.name);
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: "Failed to get models" });
  }
});

app.post("/chat", async (req, res) => {
  const { model, messages } = req.body;

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model,
      messages,
      stream: false  // ✅ This disables streaming
    });

    // Now response.data.message.content will be complete
    res.json({ message: response.data.message });
  } catch (error) {
    console.error("Failed to chat:", error);
    res.status(500).json({ error: "Failed to chat with model" });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
