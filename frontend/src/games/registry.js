// One entry per game type = everything the frontend needs to add a new type:
//   Renderer (student) + Editor (teacher) + content shape + validation + answer mapping.
import { FillBlankEditor, MatchingEditor, QuizEditor, TrueFalseEditor } from "./editors/Editors";
import FillBlankRenderer from "./renderers/FillBlank";
import MatchingRenderer from "./renderers/Matching";
import QuizRenderer from "./renderers/Quiz";
import TrueFalseRenderer from "./renderers/TrueFalse";

// same normalisation as the backend (games/question_types.py: collapse inner spaces, ignore case)
const collapse = (s) => s.trim().replace(/\s+/g, " ");
const norm = (s) => collapse(s).toLowerCase();
const dup = (arr) => new Set(arr.map(norm)).size !== arr.length;

export const TYPES = {
  quiz: {
    Renderer: QuizRenderer, Editor: QuizEditor,
    initialValue: () => [],
    ready: (v) => v.length > 0,
    toAnswer: (v) => ({ selected: v }),
    empty: () => ({ options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] }),
    fromApi: (c) => ({ options: c.options.map((o) => ({ text: o.text, is_correct: !!o.is_correct })) }),
    toApi: (c) => ({ options: c.options.map((o) => ({ text: o.text.trim(), is_correct: !!o.is_correct })) }),
    validate: (c) => {
      if (c.options.some((o) => !o.text.trim())) return "Barcha variantlarni to'ldiring yoki ortiqchasini o'chiring.";
      if (c.options.length < 2) return "Kamida 2 ta variant kerak.";
      if (c.options.length > 6) return "Ko'pi bilan 6 ta variant bo'lishi mumkin.";
      if (c.options.some((o) => collapse(o.text).length > 120)) return "Variant matni ko'pi bilan 120 belgi bo'lsin.";
      if (dup(c.options.map((o) => o.text))) return "Variantlar bir-biriga o'xshamasligi kerak.";
      if (!c.options.some((o) => o.is_correct)) return "Kamida bitta to'g'ri javobni belgilang.";
      return null;
    },
    summary: (c) => `${c.options.length} variant · ${c.options.filter((o) => o.is_correct).length} to'g'ri`,
  },
  true_false: {
    Renderer: TrueFalseRenderer, Editor: TrueFalseEditor,
    initialValue: () => null,
    ready: (v) => v !== null,
    toAnswer: (v) => ({ value: v }),
    empty: () => ({ correct: null }),
    fromApi: (c) => ({ correct: c.correct }),
    toApi: (c) => ({ correct: c.correct }),
    validate: (c) => (typeof c.correct === "boolean" ? null : "Gap to'g'ri yoki noto'g'ri ekanini tanlang."),
    summary: (c) => (c.correct ? "Javob: to'g'ri" : "Javob: noto'g'ri"),
  },
  matching: {
    Renderer: MatchingRenderer, Editor: MatchingEditor,
    initialValue: () => ({}),
    ready: (v, q) => Object.keys(v).length === q.content.left.length,
    toAnswer: (v) => ({ pairs: Object.entries(v).map(([left, right]) => ({ left, right })) }),
    empty: () => ({ pairs: [{ left: "", right: "" }, { left: "", right: "" }] }),
    fromApi: (c) => ({ pairs: c.pairs.map((p) => ({ left: p.left, right: p.right })) }),
    toApi: (c) => ({ pairs: c.pairs.map((p) => ({ left: p.left.trim(), right: p.right.trim() })) }),
    validate: (c) => {
      if (c.pairs.some((p) => !p.left.trim() || !p.right.trim())) return "Barcha juftliklarni to'ldiring yoki ortiqchasini o'chiring.";
      if (c.pairs.length < 2) return "Kamida 2 ta juftlik kerak.";
      if (c.pairs.length > 8) return "Ko'pi bilan 8 ta juftlik bo'lishi mumkin.";
      if (c.pairs.some((p) => collapse(p.left).length > 60 || collapse(p.right).length > 60)) return "Juftlik matni ko'pi bilan 60 belgi bo'lsin.";
      if (dup(c.pairs.map((p) => p.left)) || dup(c.pairs.map((p) => p.right))) return "Chap va o'ng ustunda takror qiymat bo'lmasin.";
      return null;
    },
    summary: (c) => `${c.pairs.length} juftlik`,
  },
  fill_blank: {
    Renderer: FillBlankRenderer, Editor: FillBlankEditor,
    initialValue: () => "",
    ready: (v) => v.trim().length > 0,
    toAnswer: (v) => ({ text: v.trim() }),
    empty: () => ({ accepted: [""], case_sensitive: false }),
    fromApi: (c) => ({ accepted: [...c.accepted], case_sensitive: !!c.case_sensitive }),
    toApi: (c) => ({ accepted: c.accepted.map((a) => a.trim()), case_sensitive: !!c.case_sensitive }),
    validate: (c) => {
      if (c.accepted.some((a) => !a.trim())) return "Bo'sh javob variantlarini to'ldiring yoki o'chiring.";
      if (c.accepted.length < 1 || c.accepted.length > 10) return "Javob variantlari soni 1 dan 10 gacha bo'lsin.";
      if (c.accepted.some((a) => collapse(a).length > 60)) return "Javob ko'pi bilan 60 belgi bo'lsin.";
      if (new Set(c.accepted.map((a) => (c.case_sensitive ? collapse(a) : norm(a)))).size !== c.accepted.length) return "Javob variantlari takrorlanmasin.";
      return null;
    },
    summary: (c) => c.accepted.join(" / "),
  },
};
