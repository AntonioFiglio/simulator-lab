"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Check, Sparkles } from "lucide-react";
import type { OfferChat, OfferDraft } from "@packages/offer-understanding/chat";
import { Card, Field, Badge, Notice, api } from "./ui";
import OfferVoice from "./OfferVoice";
const kinds = {
  physical: "Produto físico",
  digital: "Produto digital",
  service: "Serviço",
  subscription: "Assinatura",
};
export default function Offer({
  aiConfigured,
  refresh,
  navigate,
}: {
  aiConfigured: boolean;
  refresh: () => Promise<void>;
  navigate: (path: string) => void;
}) {
  const [chat, setChat] = useState<OfferChat>(),
    [draft, setDraft] = useState<OfferDraft>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false),
    [error, setError] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [transcribed, setTranscribed] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const apply = (value: OfferChat) => {
    setChat(value);
    setDraft(value.draft);
    setReviewed(false);
  };
  useEffect(() => {
    let active = true;
    api<OfferChat>("offer/chat")
      .then((v) => {
        if (active) apply(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [chat?.messages.length]);
  const locked = busy || voiceBusy;
  async function send() {
    if (!chat || !message.trim() || locked) return;
    setBusy(true);
    setError("");
    setReviewed(false);
    try {
      apply(
        await api<OfferChat>("offer/chat", {
          revision: chat.revision,
          message,
          draft,
        }),
      );
      setMessage("");
      setTranscribed(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit<K extends keyof OfferDraft>(key: K, value: OfferDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setReviewed(false);
  }
  const complete =
    !!draft?.title?.trim() &&
    (draft.description?.trim().length ?? 0) >= 10 &&
    !!draft.kind &&
    draft.price !== null &&
    draft.price >= 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSUMER LAB / NOVA OFERTA</div>
          <h1>Sua próxima oferta começa aqui.</h1>
          <p>Uma conversa curta. Uma proposta pronta para revisar.</p>
        </div>
        <Badge tone="blue">GPT-4o-mini</Badge>
      </div>
      {!aiConfigured && (
        <Notice>
          Configure OPENAI_API_KEY no servidor para conversar e transcrever
          áudio. A ficha permanece disponível para edição manual.
        </Notice>
      )}
      {error && (
        <div role="alert" className="error">
          {error}{" "}
          {!chat && (
            <button
              onClick={() => {
                setError("");
                api<OfferChat>("offer/chat")
                  .then(apply)
                  .catch((e) => setError(e.message));
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {!chat ? (
        <Card>
          <p role="status">Carregando conversa…</p>
        </Card>
      ) : (
        <div className="two-columns offer-layout">
          <Card>
            <div className="offer-chat-heading">
              <h2>Vamos construir sua ideia</h2>
              <button
                className="secondary"
                disabled={locked}
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Começar outra oferta? O rascunho atual será substituído. Ofertas já confirmadas serão preservadas.",
                    )
                  )
                    return;
                  setBusy(true);
                  setError("");
                  try {
                    apply(
                      await api<OfferChat>("offer/chat", {
                        revision: chat.revision,
                        reset: true,
                      }),
                    );
                    setMessage("");
                    setTranscribed(false);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Nova conversa
              </button>
            </div>
            <div
              className="offer-messages"
              role="log"
              aria-label="Conversa sobre a oferta"
              aria-live="polite"
            >
              {chat.messages.map((m, i) => (
                <div key={i} className={`offer-message ${m.role}`}>
                  <strong>{m.role === "assistant" ? "Simula" : "Você"}</strong>
                  <p>{m.content}</p>
                </div>
              ))}
              {busy && <p role="status">Organizando sua oferta…</p>}
              <div ref={bottom} />
            </div>
            {chat.confirmedOfferId ? (
              <Notice>
                Oferta confirmada. Você pode seguir para a simulação ou começar
                uma nova conversa.
              </Notice>
            ) : (
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <Field
                  label={
                    transcribed
                      ? "Revise a transcrição antes de enviar"
                      : "Sua resposta"
                  }
                >
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={message}
                    disabled={locked}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conte sua ideia ou responda à pergunta…"
                  />
                </Field>
                <div className="offer-actions">
                  <OfferVoice
                    disabled={locked || !aiConfigured}
                    onBusy={setVoiceBusy}
                    onError={setError}
                    onText={(text) => {
                      setMessage((old) =>
                        [old, text].filter(Boolean).join("\n").slice(0, 4000),
                      );
                      setTranscribed(true);
                    }}
                  />
                  <button
                    type="submit"
                    className="primary"
                    disabled={locked || !message.trim() || !aiConfigured}
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </div>
                <p className="hint">
                  Texto e áudio são enviados à OpenAI. Não inclua dados pessoais
                  de compradores. Áudio de até 60 segundos; revise a transcrição
                  antes de enviar ao chat.
                </p>
              </form>
            )}
          </Card>
          {draft && (
            <Card>
              <Badge>
                {complete ? "Pronta para revisão" : "Rascunho da oferta"}
              </Badge>
              <h2>
                <Sparkles size={20} /> Sua oferta, com clareza
              </h2>
              <p className="hint">
                Revise todos os campos. Você também pode ajustá-los diretamente
                antes de confirmar.
              </p>
              <fieldset
                disabled={locked || !!chat.confirmedOfferId}
                className="offer-fields form-stack"
              >
                <Field label="Nome da oferta">
                  <input
                    maxLength={150}
                    value={draft.title ?? ""}
                    onChange={(e) => edit("title", e.target.value || null)}
                  />
                </Field>
                <Field label="Descrição livre">
                  <textarea
                    rows={4}
                    maxLength={4000}
                    value={draft.description ?? ""}
                    onChange={(e) =>
                      edit("description", e.target.value || null)
                    }
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Tipo">
                    <select
                      value={draft.kind ?? ""}
                      onChange={(e) =>
                        edit(
                          "kind",
                          (e.target.value as OfferDraft["kind"]) || null,
                        )
                      }
                    >
                      <option value="">A definir</option>
                      {Object.entries(kinds).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Categoria">
                    <input
                      maxLength={100}
                      placeholder="Desconhecida"
                      value={draft.category ?? ""}
                      onChange={(e) => edit("category", e.target.value || null)}
                    />
                  </Field>
                  <Field label="Preço (R$)">
                    <input
                      type="number"
                      min={0}
                      max={1e9}
                      step="0.01"
                      value={draft.price ?? ""}
                      onChange={(e) =>
                        edit(
                          "price",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field label="Custo unitário (opcional)">
                    <input
                      type="number"
                      min={0}
                      max={1e9}
                      step="0.01"
                      placeholder="Desconhecido"
                      value={draft.unitCost ?? ""}
                      onChange={(e) =>
                        edit(
                          "unitCost",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                </div>
                <Field label="Benefícios declarados (um por linha)">
                  <textarea
                    rows={3}
                    value={draft.statedBenefits.join("\n")}
                    onChange={(e) =>
                      edit("statedBenefits", e.target.value.split("\n"))
                    }
                  />
                </Field>
                <Field label="Público desejado (opcional)">
                  <input
                    maxLength={300}
                    value={draft.targetAudience ?? ""}
                    onChange={(e) =>
                      edit("targetAudience", e.target.value || null)
                    }
                  />
                </Field>
                {!!chat.suggestions.length && (
                  <Notice>
                    Sugestões da IA para sua revisão:{" "}
                    {chat.suggestions.join(" · ")}
                  </Notice>
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  Revisei os campos e aceito as sugestões que mantive na ficha.
                </label>
              </fieldset>
              {chat.confirmedOfferId ? (
                <button
                  className="primary"
                  onClick={() => navigate("/simulations/new")}
                >
                  Configurar simulação
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={locked || !complete || !reviewed}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api("offer/chat", {
                        revision: chat.revision,
                        confirm: true,
                        draft: {
                          ...draft,
                          statedBenefits: draft.statedBenefits
                            .map((b) => b.trim())
                            .filter(Boolean),
                        },
                      });
                      await refresh();
                      navigate("/simulations/new");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Check size={16} />
                  Confirmar oferta e continuar
                </button>
              )}
              {!complete && (
                <p className="hint">
                  Para continuar, defina nome, descrição (mínimo de 10
                  caracteres), tipo e preço. Campos opcionais podem ficar
                  vazios.
                </p>
              )}
              <p className="hint">
                Confirmar não inicia uma simulação. Reações simuladas não
                comprovam demanda real.
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
