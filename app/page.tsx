"use client"; 
import { useState } from "react";

export default function ChatPage() {
  const [apiKey, setApiKey] = useState("");
  const [userName, setUserName] = useState("");
  const [userPersona, setUserPersona] = useState("");
  const [userActive, setUserActive] = useState(true);
  const [collapsedUser, setCollapsedUser] = useState(false);
  const [systemPrompts, setSystemPrompts] = useState([
    { name: "Agent 1", prompt: "", active: true },
    { name: "Agent 2", prompt: "", active: true },
    { name: "Agent 3", prompt: "", active: false },
  ]);
  const [collapsedAgents, setCollapsedAgents] = useState([false, false, false]);
  const [scenarioTopic, setScenarioTopic] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAgentToggle = (i) => {
    const newPrompts = [...systemPrompts];
    newPrompts[i].active = !newPrompts[i].active;
    setSystemPrompts(newPrompts);
  };

  const toggleCollapse = (i) => {
    const updated = [...collapsedAgents];
    updated[i] = !updated[i];
    setCollapsedAgents(updated);
  };

  const toggleCollapseUser = () => {
    setCollapsedUser(!collapsedUser);
  };

  const handlePromptChange = (i, value) => {
    const newPrompts = [...systemPrompts];
    newPrompts[i].prompt = value;
    setSystemPrompts(newPrompts);
  };

  const generateRandomPreset = async () => {
    const activeAgents = systemPrompts.filter(a => a.active);
    const totalCharacters = activeAgents.length + (userActive ? 1 : 0);
    if (totalCharacters === 0 || !scenarioTopic.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "당신은 상황극 시나리오 창작 전문가입니다." },
            {
              role: "user",
              content: `
다음 상황극을 생성해줘:
- 주제: ${scenarioTopic}
- 총 등장인물: ${totalCharacters}명 (유저 포함 여부: ${userActive})

각 인물은 다음 형식으로 작성해줘:
{
  "user": { "name": "이름", "prompt": "성격/말투 설명" },
  "agents": [
    { "name": "이름1", "prompt": "말투", "active": true },
    ...
  ]
}
              `.trim()
            }
          ],
          temperature: 1,
          max_tokens: 800,
        })
      });
      const data = await response.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (userActive && parsed.user) {
        setUserName(parsed.user.name);
        setUserPersona(parsed.user.prompt);
      }
      if (parsed.agents) {
        setSystemPrompts(parsed.agents);
        setCollapsedAgents(parsed.agents.map(() => false));
      }
    } catch (err) {
      console.error("GPT 프리셋 생성 실패:", err);
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    for (const agent of systemPrompts.filter(a => a.active)) {
      const finalPrompt = `${agent.prompt}`;
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: finalPrompt },
              ...newMessages,
            ],
            temperature: 0.9,
            max_tokens: 600,
          }),
        });
        const data = await res.json();
        const assistantReply = data.choices?.[0]?.message?.content;
        if (assistantReply) {
          setMessages(prev => [...prev, { role: "assistant", content: `[${agent.name}] ${assistantReply}` }]);
        }
      } catch (err) {
        console.error("응답 실패:", err);
      }
    }
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 30, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: 16 }}>🧠 FREND - Multi-Agent GPT Simulator</h1>

      <button
        onClick={generateRandomPreset}
        disabled={isLoading || !apiKey}
        style={{
          padding: 12,
          background: '#10b981',
          color: '#fff',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: 20,
          width: '100%',
        }}>
        🎲 연애/회사 상황극 프리셋 AI로 생성하기
      </button>

      <input
        placeholder="GPT API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 10 }}
      />
      <input
        placeholder="상황극 주제 입력 (예: 회사, 정치, 학교)"
        value={scenarioTopic}
        onChange={(e) => setScenarioTopic(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 20 }}
      />

      {/* 유저 카드 */}
      <div style={{ marginBottom: 16, padding: 10, background: '#f9f9f9', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" checked={userActive} onChange={() => setUserActive(!userActive)} style={{ marginRight: 8 }} />
            <strong>{userName || "당신 (유저)"}</strong>
          </label>
          <button onClick={toggleCollapseUser} style={{ fontSize: 12, background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer' }}>
            {collapsedUser ? '펼치기 🔽' : '접기 🔼'}
          </button>
        </div>
        {!collapsedUser && (
          <>
            <input
              placeholder="이름"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }}
            />
            <textarea
              placeholder="성격이나 말투"
              value={userPersona}
              onChange={(e) => setUserPersona(e.target.value)}
              style={{ width: "100%", padding: 10, minHeight: 60, borderRadius: 6, border: '1px solid #ddd' }}
            />
          </>
        )}
      </div>

      {/* 에이전트 카드들 */}
      {systemPrompts.map((agent, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 10, background: '#f9f9f9', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={agent.active} onChange={() => handleAgentToggle(i)} style={{ marginRight: 8 }} />
              <strong>{agent.name}</strong>
            </label>
            <button onClick={() => toggleCollapse(i)} style={{ fontSize: 12, background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer' }}>
              {collapsedAgents[i] ? '펼치기 🔽' : '접기 🔼'}
            </button>
          </div>
          {!collapsedAgents[i] && (
            <>
              <input
                value={agent.name}
                onChange={(e) => {
                  const newAgents = [...systemPrompts];
                  newAgents[i].name = e.target.value;
                  setSystemPrompts(newAgents);
                }}
                style={{ width: "100%", padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid #ddd' }}
              />
              <textarea
                value={agent.prompt}
                onChange={(e) => handlePromptChange(i, e.target.value)}
                style={{ width: "100%", padding: 10, minHeight: 60, borderRadius: 6, border: '1px solid #ddd' }}
              />
            </>
          )}
        </div>
      ))}

      <textarea
        placeholder="메시지 입력..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        style={{ width: '100%', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #ccc' }}
      />

      <button
        onClick={handleSend}
        disabled={isLoading}
        style={{
          padding: 12,
          width: '100%',
          background: isLoading ? '#9ca3af' : '#4f46e5',
          color: '#fff',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: 8,
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}>
        {isLoading ? "🤖 응답 생성 중..." : "🚀 메시지 보내기"}
      </button>

      <div style={{ marginTop: 30, background: '#f3f4f6', padding: 16, borderRadius: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: msg.role === "user" ? '#eef6fc' : '#fdecef', borderRadius: 8 }}>
            <strong>{msg.role === "user" ? "🧑 You" : "🤖 AI"}</strong>: {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}
