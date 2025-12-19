import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Quiz.css'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Question types
const QUESTION_TYPES = {
  multiple: { id: 'multiple', name: 'Choix multiples', icon: '🔘' },
  truefalse: { id: 'truefalse', name: 'Vrai / Faux', icon: '✓✗' },
  poll: { id: 'poll', name: 'Sondage', icon: '📊' },
  open: { id: 'open', name: 'Réponse libre', icon: '✍️' },
  rating: { id: 'rating', name: 'Notation', icon: '⭐' }
}

// Emoji reactions
const REACTIONS = ['👍', '❤️', '😂', '😮', '🎉', '🤔', '👏', '🔥']

// Default quiz template
const DEFAULT_QUIZ = {
  title: 'Mon Quiz',
  questions: [
    {
      id: 1,
      type: 'multiple',
      question: 'Quelle est la capitale de la France ?',
      options: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'],
      correct: 0,
      timeLimit: 30,
      points: 100
    }
  ],
  settings: {
    showLeaderboard: true,
    randomizeQuestions: false,
    randomizeOptions: false,
    showCorrectAnswer: true,
    allowLateJoin: true
  }
}

// Facilitator Controls Component
const FacilitatorControls = ({ quiz, currentQuestion, onNext, onPrev, onShowResults, onEndQuiz, participants, reactions }) => (
  <div className="facilitator-panel">
    <div className="facilitator-header">
      <h3>🎯 Mode Facilitateur</h3>
      <span className="participant-count">{participants.length} participants</span>
    </div>

    <div className="facilitator-stats">
      <div className="stat-box">
        <span className="stat-value">{quiz.questions.length}</span>
        <span className="stat-label">Questions</span>
      </div>
      <div className="stat-box">
        <span className="stat-value">{currentQuestion + 1}</span>
        <span className="stat-label">Actuelle</span>
      </div>
      <div className="stat-box">
        <span className="stat-value">{Object.values(reactions).reduce((a, b) => a + b, 0)}</span>
        <span className="stat-label">Réactions</span>
      </div>
    </div>

    <div className="facilitator-actions">
      <button onClick={onPrev} disabled={currentQuestion === 0} className="ctrl-btn">
        ⬅️ Précédent
      </button>
      <button onClick={onShowResults} className="ctrl-btn primary">
        📊 Résultats
      </button>
      <button onClick={onNext} disabled={currentQuestion >= quiz.questions.length - 1} className="ctrl-btn">
        Suivant ➡️
      </button>
    </div>

    <button onClick={onEndQuiz} className="end-quiz-btn">
      🏁 Terminer le Quiz
    </button>
  </div>
)

// Live Reactions Display
const LiveReactions = ({ reactions, onReact }) => (
  <div className="live-reactions">
    <div className="reactions-display">
      {Object.entries(reactions).map(([emoji, count]) => (
        count > 0 && (
          <motion.div
            key={emoji}
            className="reaction-bubble"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
          >
            <span className="emoji">{emoji}</span>
            <span className="count">{count}</span>
          </motion.div>
        )
      ))}
    </div>
    <div className="reactions-buttons">
      {REACTIONS.map(emoji => (
        <motion.button
          key={emoji}
          className="reaction-btn"
          onClick={() => onReact(emoji)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  </div>
)

// Question Display Component
const QuestionDisplay = ({ question, questionNumber, totalQuestions, timeLeft, onAnswer, selectedAnswer, showResults, answers }) => {
  const getOptionClass = (index) => {
    if (!showResults) return selectedAnswer === index ? 'selected' : ''
    if (question.type === 'poll') return ''
    return index === question.correct ? 'correct' : selectedAnswer === index ? 'wrong' : ''
  }

  const getPercentage = (index) => {
    const total = Object.values(answers).reduce((a, b) => a + b, 0)
    return total > 0 ? Math.round((answers[index] || 0) / total * 100) : 0
  }

  return (
    <div className="question-display">
      <div className="question-header">
        <span className="question-number">Question {questionNumber}/{totalQuestions}</span>
        <div className="question-type-badge">
          {QUESTION_TYPES[question.type]?.icon} {QUESTION_TYPES[question.type]?.name}
        </div>
        {timeLeft !== null && (
          <div className={`timer-badge ${timeLeft <= 5 ? 'critical' : ''}`}>
            ⏱️ {timeLeft}s
          </div>
        )}
      </div>

      <motion.h2
        className="question-text"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {question.question}
      </motion.h2>

      {question.points && (
        <div className="points-badge">{question.points} points</div>
      )}

      <div className={`options-grid type-${question.type}`}>
        {question.type === 'truefalse' ? (
          <>
            <motion.button
              className={`option-btn true ${getOptionClass(0)}`}
              onClick={() => onAnswer(0)}
              disabled={showResults}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="option-icon">✓</span>
              <span className="option-text">Vrai</span>
              {showResults && <span className="percentage">{getPercentage(0)}%</span>}
            </motion.button>
            <motion.button
              className={`option-btn false ${getOptionClass(1)}`}
              onClick={() => onAnswer(1)}
              disabled={showResults}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="option-icon">✗</span>
              <span className="option-text">Faux</span>
              {showResults && <span className="percentage">{getPercentage(1)}%</span>}
            </motion.button>
          </>
        ) : question.type === 'rating' ? (
          <div className="rating-options">
            {[1, 2, 3, 4, 5].map(star => (
              <motion.button
                key={star}
                className={`star-btn ${selectedAnswer >= star ? 'active' : ''}`}
                onClick={() => onAnswer(star)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                ⭐
              </motion.button>
            ))}
          </div>
        ) : question.type === 'open' ? (
          <textarea
            className="open-answer"
            placeholder="Votre réponse..."
            onChange={(e) => onAnswer(e.target.value)}
            disabled={showResults}
          />
        ) : (
          question.options?.map((option, index) => (
            <motion.button
              key={index}
              className={`option-btn color-${index} ${getOptionClass(index)}`}
              onClick={() => onAnswer(index)}
              disabled={showResults}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
              {showResults && (
                <div className="result-bar" style={{ width: `${getPercentage(index)}%` }} />
              )}
              {showResults && <span className="percentage">{getPercentage(index)}%</span>}
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}

// Leaderboard Component
const Leaderboard = ({ participants, showFull = false }) => {
  const sorted = [...participants].sort((a, b) => b.score - a.score)
  const display = showFull ? sorted : sorted.slice(0, 5)

  return (
    <div className={`leaderboard ${showFull ? 'full' : ''}`}>
      <h3>🏆 Classement</h3>
      <div className="leaderboard-list">
        {display.map((p, index) => (
          <motion.div
            key={p.id}
            className={`leaderboard-item rank-${index + 1}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <span className="rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <span className="name">{p.name}</span>
            <span className="score">{p.score} pts</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Results Export Component
const ResultsExport = ({ quiz, participants, answers }) => {
  const exportToCSV = () => {
    let csv = 'Participant,Score,'
    quiz.questions.forEach((q, i) => {
      csv += `Q${i + 1},`
    })
    csv += '\n'

    participants.forEach(p => {
      csv += `${p.name},${p.score},`
      quiz.questions.forEach((q, i) => {
        const answer = p.answers?.[i]
        if (q.type === 'multiple' || q.type === 'truefalse') {
          csv += `${q.options?.[answer] || answer},`
        } else {
          csv += `${answer},`
        }
      })
      csv += '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-results-${Date.now()}.csv`
    a.click()
  }

  const exportToJSON = () => {
    const data = {
      quiz: quiz.title,
      date: new Date().toISOString(),
      participants: participants.map(p => ({
        name: p.name,
        score: p.score,
        answers: p.answers
      })),
      statistics: quiz.questions.map((q, i) => ({
        question: q.question,
        answers: answers[i] || {}
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-results-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="export-options">
      <h3>📥 Exporter les résultats</h3>
      <div className="export-buttons">
        <button onClick={exportToCSV} className="export-btn csv">
          📊 Export CSV
        </button>
        <button onClick={exportToJSON} className="export-btn json">
          📋 Export JSON
        </button>
      </div>
    </div>
  )
}

// Main Quiz Component
export default function Quiz() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [mode, setMode] = useState('lobby') // lobby, playing, results, create
  const [quiz, setQuiz] = useState(DEFAULT_QUIZ)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [participants, setParticipants] = useState([
    { id: 1, name: 'Vous', score: 0, answers: {} }
  ])
  const [answers, setAnswers] = useState({})
  const [reactions, setReactions] = useState(
    REACTIONS.reduce((acc, r) => ({ ...acc, [r]: 0 }), {})
  )
  const [isFacilitator, setIsFacilitator] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [quizCode, setQuizCode] = useState(code || '')

  const timerRef = useRef(null)

  // Timer countdown
  useEffect(() => {
    if (mode === 'playing' && timeLeft !== null && timeLeft > 0 && !showResults) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && !showResults) {
      handleTimeUp()
    }

    return () => clearTimeout(timerRef.current)
  }, [timeLeft, mode, showResults])

  // Handle time up
  const handleTimeUp = () => {
    setShowResults(true)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
  }

  // Handle answer selection
  const handleAnswer = (answerIndex) => {
    if (showResults) return
    setSelectedAnswer(answerIndex)

    // Update answers statistics
    const qIndex = currentQuestion
    setAnswers(prev => ({
      ...prev,
      [qIndex]: {
        ...prev[qIndex],
        [answerIndex]: (prev[qIndex]?.[answerIndex] || 0) + 1
      }
    }))

    // Calculate score
    const question = quiz.questions[currentQuestion]
    if (question.correct === answerIndex) {
      const timeBonus = Math.round((timeLeft / question.timeLimit) * 50)
      const points = question.points + timeBonus
      setParticipants(prev => prev.map(p =>
        p.id === 1 ? { ...p, score: p.score + points, answers: { ...p.answers, [qIndex]: answerIndex } } : p
      ))
    }

    // Auto show results after 1 second
    setTimeout(() => setShowResults(true), 1000)
  }

  // Handle reaction
  const handleReaction = (emoji) => {
    setReactions(prev => ({
      ...prev,
      [emoji]: prev[emoji] + 1
    }))
    if (navigator.vibrate) navigator.vibrate(50)
  }

  // Next question
  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setShowResults(false)
      setTimeLeft(quiz.questions[currentQuestion + 1].timeLimit)
      setReactions(REACTIONS.reduce((acc, r) => ({ ...acc, [r]: 0 }), {}))
    } else {
      setMode('results')
    }
  }

  // Previous question
  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
      setSelectedAnswer(null)
      setShowResults(true)
    }
  }

  // Start quiz
  const startQuiz = () => {
    setMode('playing')
    setCurrentQuestion(0)
    setTimeLeft(quiz.questions[0].timeLimit)
  }

  // Join quiz as participant
  const joinQuiz = () => {
    if (!playerName.trim()) return
    setParticipants(prev => [{ id: 1, name: playerName, score: 0, answers: {} }])
    setMode('lobby')
  }

  // Share functions
  const shareQuiz = (method) => {
    const url = `${window.location.origin}/quiz/${quizCode || 'demo'}`
    const text = `Rejoignez mon quiz "${quiz.title}" !`

    if (method === 'sms') {
      window.open(`sms:?body=${encodeURIComponent(text + ' ' + url)}`)
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`)
    } else if (method === 'copy') {
      navigator.clipboard.writeText(url)
      alert('Lien copié !')
    }
  }

  return (
    <div className="quiz-page">
      {/* Header */}
      <header className="quiz-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1>{quiz.title}</h1>
        </div>
        <div className="header-right">
          {quizCode && <span className="quiz-code">Code: {quizCode}</span>}
          {isFacilitator && <span className="facilitator-badge">👑 Facilitateur</span>}
        </div>
      </header>

      {/* Join Screen */}
      <AnimatePresence mode="wait">
        {mode === 'join' && (
          <motion.div
            className="join-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="join-card">
              <h2>🎮 Rejoindre le Quiz</h2>
              <input
                type="text"
                placeholder="Votre nom"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
              <input
                type="text"
                placeholder="Code du quiz"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button onClick={joinQuiz} disabled={!playerName.trim()}>
                Rejoindre
              </button>
            </div>
          </motion.div>
        )}

        {/* Lobby */}
        {mode === 'lobby' && (
          <motion.div
            className="lobby-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="lobby-content">
              <div className="lobby-info">
                <h2>{quiz.title}</h2>
                <p>{quiz.questions.length} questions</p>

                <div className="share-section">
                  <h3>📤 Partager le quiz</h3>
                  <div className="share-buttons">
                    <button onClick={() => shareQuiz('whatsapp')} className="share-btn whatsapp">
                      <span>📱</span> WhatsApp
                    </button>
                    <button onClick={() => shareQuiz('sms')} className="share-btn sms">
                      <span>💬</span> SMS
                    </button>
                    <button onClick={() => shareQuiz('copy')} className="share-btn copy">
                      <span>🔗</span> Copier
                    </button>
                  </div>
                </div>

                <div className="participants-list">
                  <h3>👥 Participants ({participants.length})</h3>
                  {participants.map(p => (
                    <div key={p.id} className="participant-item">
                      <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
                      <span className="name">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lobby-actions">
                <label className="facilitator-toggle">
                  <input
                    type="checkbox"
                    checked={isFacilitator}
                    onChange={(e) => setIsFacilitator(e.target.checked)}
                  />
                  <span>Mode Facilitateur</span>
                </label>
                <button onClick={startQuiz} className="start-btn">
                  🚀 Lancer le Quiz
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Playing */}
        {mode === 'playing' && (
          <motion.div
            className="playing-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="game-layout">
              {/* Main question area */}
              <div className="question-area">
                <QuestionDisplay
                  question={quiz.questions[currentQuestion]}
                  questionNumber={currentQuestion + 1}
                  totalQuestions={quiz.questions.length}
                  timeLeft={timeLeft}
                  onAnswer={handleAnswer}
                  selectedAnswer={selectedAnswer}
                  showResults={showResults}
                  answers={answers[currentQuestion] || {}}
                />

                {showResults && (
                  <motion.button
                    className="next-btn"
                    onClick={nextQuestion}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {currentQuestion < quiz.questions.length - 1 ? 'Question suivante ➡️' : 'Voir les résultats 🏆'}
                  </motion.button>
                )}
              </div>

              {/* Sidebar */}
              <div className="game-sidebar">
                <LiveReactions reactions={reactions} onReact={handleReaction} />

                {quiz.settings.showLeaderboard && (
                  <Leaderboard participants={participants} />
                )}

                {isFacilitator && (
                  <FacilitatorControls
                    quiz={quiz}
                    currentQuestion={currentQuestion}
                    onNext={nextQuestion}
                    onPrev={prevQuestion}
                    onShowResults={() => setShowResults(true)}
                    onEndQuiz={() => setMode('results')}
                    participants={participants}
                    reactions={reactions}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {mode === 'results' && (
          <motion.div
            className="results-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="results-content">
              <h2>🎉 Quiz Terminé !</h2>

              <div className="final-score">
                <span className="score-label">Votre score</span>
                <span className="score-value">{participants[0]?.score || 0}</span>
                <span className="score-max">/ {quiz.questions.reduce((a, q) => a + q.points, 0)}</span>
              </div>

              <Leaderboard participants={participants} showFull />

              <div className="results-stats">
                <h3>📊 Statistiques</h3>
                {quiz.questions.map((q, i) => (
                  <div key={i} className="question-stat">
                    <span className="q-number">Q{i + 1}</span>
                    <span className="q-text">{q.question}</span>
                    <div className="answer-bars">
                      {q.options?.map((opt, j) => (
                        <div key={j} className="answer-bar-row">
                          <span className="opt-label">{opt}</span>
                          <div className="bar-bg">
                            <div
                              className={`bar-fill ${j === q.correct ? 'correct' : ''}`}
                              style={{
                                width: `${answers[i]?.[j] ? (answers[i][j] / Object.values(answers[i] || {}).reduce((a,b) => a+b, 1)) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="opt-count">{answers[i]?.[j] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <ResultsExport quiz={quiz} participants={participants} answers={answers} />

              <div className="results-actions">
                <button onClick={() => {
                  setMode('lobby')
                  setCurrentQuestion(0)
                  setParticipants(prev => prev.map(p => ({ ...p, score: 0, answers: {} })))
                  setAnswers({})
                }} className="replay-btn">
                  🔄 Rejouer
                </button>
                <Link to="/dashboard" className="home-btn">
                  🏠 Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
