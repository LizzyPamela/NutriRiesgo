import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, CheckCircle, Heart } from 'lucide-react';
import { enviarConsulta } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  abstension?: boolean;
  derivacion?: boolean;
  nivel_confianza?: 'alto' | 'medio' | 'bajo';
  chunks_utilizados?: any[];
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de nutrición de NutriRiesgo-UNAH. Puedo ayudarte con:\n\n• Consultas sobre alimentación saludable\n• Información nutricional de alimentos\n• Recomendaciones para prevenir enfermedades cardiovasculares\n• Guías basadas en OMS, INCAP y autoridades hondureñas\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    }
  ]);
  const { userId } = useAuth();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await enviarConsulta(input, userId ?? undefined);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.respuesta,
        timestamp: new Date(),
        abstension: data.abstension,
        derivacion: data.derivacion,
        nivel_confianza: data.nivel_confianza,
        chunks_utilizados: data.chunks_utilizados,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfianzaColor = (nivel?: string) => {
    switch (nivel) {
      case 'alto': return 'text-nutri-success';
      case 'medio': return 'text-nutri-accent';
      case 'bajo': return 'text-nutri-danger';
      default: return 'text-nutri-gray-500';
    }
  };

  const getConfianzaBadge = (nivel?: string) => {
    switch (nivel) {
      case 'alto': return 'Alta confianza';
      case 'medio': return 'Confianza media';
      case 'bajo': return 'Baja confianza';
      default: return null;
    }
  };

  const sugerencias = [
    "¿Cuántas porciones de frutas debo comer al día?",
    "¿Qué alimentos tienen más hierro?",
    "¿Cómo prevenir enfermedades del corazón?",
    "¿Qué beneficios tienen los frijoles?"
  ];

  return (
    <div className="flex-1 flex flex-col bg-linear-to-b from-nutri-gray-50 to-white overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-nutri-gray-200 px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-nutri-primary">Chat con IA</h1>
            <p className="text-sm text-nutri-gray-600">Asistente de Nutrición</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-nutri-success rounded-full animate-pulse" />
            <span className="text-sm text-nutri-gray-600">En línea</span>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-nutri-primary'
                    : 'bg-linear-to-br from-nutri-success to-nutri-primary'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 max-w-2xl ${
                  message.role === 'user' ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-nutri-primary text-white'
                      : 'bg-white border border-nutri-gray-200 text-nutri-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>

                  {/* Metadata for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="mt-3 pt-3 border-t border-nutri-gray-200/50 space-y-2">
                      {/* Abstención Warning */}
                      {message.abstension && (
                        <div className="flex items-center space-x-2 text-sm text-nutri-accent">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">Consulta médica detectada</span>
                        </div>
                      )}

                      {/* Derivación Warning */}
                      {message.derivacion && (
                        <div className="flex items-center space-x-2 text-sm text-nutri-secondary">
                          <Heart className="w-4 h-4" />
                          <span className="font-medium">Recomendación de consulta profesional</span>
                        </div>
                      )}

                      {/* Confianza Badge */}
                      {message.nivel_confianza && !message.abstension && (
                        <div className={`text-xs ${getConfianzaColor(message.nivel_confianza)}`}>
                          {getConfianzaBadge(message.nivel_confianza)}
                        </div>
                      )}

                      {/* Fuentes */}
                      {message.chunks_utilizados && message.chunks_utilizados.length > 0 && (
                        <details className="text-xs text-nutri-gray-600">
                          <summary className="cursor-pointer hover:text-nutri-primary">
                            Ver fuentes ({message.chunks_utilizados.length})
                          </summary>
                          <div className="mt-2 space-y-1">
                            {message.chunks_utilizados.slice(0, 3).map((chunk, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <CheckCircle className="w-3 h-3 text-nutri-success shrink-0" />
                                <span>{chunk.autoridad} - {(chunk.similitud * 100).toFixed(0)}% relevancia</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-nutri-gray-500 mt-1 px-2">
                  {message.timestamp.toLocaleTimeString('es-HN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-nutri-success to-nutri-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-nutri-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-nutri-primary animate-spin" />
                  <span className="text-nutri-gray-600">Pensando...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sugerencias (solo si no hay mensajes del usuario) */}
      {messages.length === 1 && !isLoading && (
        <div className="px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-nutri-gray-600 mb-2">Preguntas sugeridas:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sugerencias.map((sugerencia, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(sugerencia)}
                  className="text-left px-4 py-2 bg-white border border-nutri-gray-200 rounded-lg hover:border-nutri-primary hover:bg-nutri-primary/5 transition-colors text-sm text-nutri-gray-700"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-nutri-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Escribe tu consulta sobre nutrición..."
                rows={1}
                className="w-full px-4 py-3 bg-nutri-gray-50 border border-nutri-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-nutri-primary focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-12 h-12 bg-nutri-primary text-white rounded-xl hover:bg-nutri-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-nutri-gray-500 mt-2 text-center">
            Sistema de orientación nutricional - No sustituye atención médica profesional
          </p>
        </form>
      </div>
    </div>
  );
};

export default Chat;