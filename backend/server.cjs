const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const PDFDocument = require("pdfkit");
const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun
} = require("docx");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const STYLES = new Set(["classico", "moderno", "minimalista"]);

const ALLOWED_ORIGINS = new Set([
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Origem não permitida."));
    }
}));
app.use(express.json({ limit: "64kb" }));

const schema = {
    type: "object",
    properties: {
        nome: { type: "string" },
        cargoObjetivo: { type: "string" },
        contato: {
            type: "object",
            properties: {
                telefone: { type: "string" },
                email: { type: "string" },
                cidade: { type: "string" },
                linkedin: { type: "string" },
                github: { type: "string" }
            },
            required: ["telefone", "email", "cidade", "linkedin", "github"]
        },
        resumo: { type: "string" },
        formacao: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    curso: { type: "string" },
                    instituicao: { type: "string" },
                    periodo: { type: "string" }
                },
                required: ["curso", "instituicao", "periodo"]
            }
        },
        experiencias: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    empresa: { type: "string" },
                    cargo: { type: "string" },
                    periodo: { type: "string" },
                    atividades: { type: "array", items: { type: "string" } }
                },
                required: ["empresa", "cargo", "periodo", "atividades"]
            }
        },
        habilidadesTecnicas: { type: "array", items: { type: "string" } },
        habilidadesComportamentais: { type: "array", items: { type: "string" } },
        cursos: { type: "array", items: { type: "string" } },
        idiomas: { type: "array", items: { type: "string" } },
        projetos: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    nome: { type: "string" },
                    descricao: { type: "string" },
                    tecnologias: { type: "array", items: { type: "string" } }
                },
                required: ["nome", "descricao", "tecnologias"]
            }
        }
    },
    required: [
        "nome", "cargoObjetivo", "contato", "resumo", "formacao",
        "experiencias", "habilidadesTecnicas", "habilidadesComportamentais",
        "cursos", "idiomas", "projetos"
    ]
};

function texto(valor) {
    return typeof valor === "string" ? valor.trim() : "";
}

function lista(valor) {
    return Array.isArray(valor) ? valor.filter((item) => typeof item === "string" && item.trim()).map(texto) : [];
}

function normalizarCurriculo(valor) {
    const contato = valor && typeof valor.contato === "object" ? valor.contato : {};
    return {
        nome: texto(valor && valor.nome),
        cargoObjetivo: texto(valor && valor.cargoObjetivo),
        contato: {
            telefone: texto(contato.telefone),
            email: texto(contato.email),
            cidade: texto(contato.cidade),
            linkedin: texto(contato.linkedin),
            github: texto(contato.github)
        },
        resumo: texto(valor && valor.resumo),
        formacao: Array.isArray(valor && valor.formacao) ? valor.formacao.map((item) => ({
            curso: texto(item && item.curso),
            instituicao: texto(item && item.instituicao),
            periodo: texto(item && item.periodo)
        })).filter((item) => item.curso || item.instituicao || item.periodo) : [],
        experiencias: Array.isArray(valor && valor.experiencias) ? valor.experiencias.map((item) => ({
            empresa: texto(item && item.empresa),
            cargo: texto(item && item.cargo),
            periodo: texto(item && item.periodo),
            atividades: lista(item && item.atividades)
        })).filter((item) => item.empresa || item.cargo || item.atividades.length) : [],
        habilidadesTecnicas: lista(valor && valor.habilidadesTecnicas),
        habilidadesComportamentais: lista(valor && valor.habilidadesComportamentais),
        cursos: lista(valor && valor.cursos),
        idiomas: lista(valor && valor.idiomas),
        projetos: Array.isArray(valor && valor.projetos) ? valor.projetos.map((item) => ({
            nome: texto(item && item.nome),
            descricao: texto(item && item.descricao),
            tecnologias: lista(item && item.tecnologias)
        })).filter((item) => item.nome || item.descricao) : []
    };
}

function promptPara(textoUsuario) {
    return `Transforme as informações abaixo em um currículo profissional estruturado.
Preserve todos os fatos. Nunca invente dados, empresas, datas, formação, tecnologias ou experiências.
Melhore apenas a redação e a organização. Campos não informados devem ficar vazios.
Crie um resumo profissional de 3 a 5 linhas apenas com os dados fornecidos.
Converta atividades em frases objetivas e separe habilidades técnicas e comportamentais.
Não inclua explicações fora do JSON.

INFORMAÇÕES DO USUÁRIO:
${textoUsuario}`;
}

function exigirConfiguracao() {
    if (!process.env.GEMINI_API_KEY) {
        const erro = new Error("GEMINI_API_KEY não configurada.");
        erro.statusCode = 503;
        throw erro;
    }
}

async function gerarDados(textoUsuario) {
    exigirConfiguracao();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const interaction = await ai.interactions.create({
        model: MODEL,
        input: promptPara(textoUsuario),
        response_format: { type: "text", mime_type: "application/json", schema }
    });
    if (!interaction.output_text) {
        throw new Error("A IA não retornou dados para o currículo.");
    }
    return normalizarCurriculo(JSON.parse(interaction.output_text));
}

function valorContato(curriculo) {
    return Object.values(curriculo.contato).filter(Boolean).join(" · ");
}

function secoes(curriculo) {
    const itens = [];
    if (curriculo.resumo) itens.push(["Resumo profissional", [curriculo.resumo]]);
    if (curriculo.formacao.length) itens.push(["Formação acadêmica", curriculo.formacao.map((item) => `${item.curso}${item.instituicao ? ` — ${item.instituicao}` : ""}${item.periodo ? ` (${item.periodo})` : ""}`)]);
    if (curriculo.experiencias.length) itens.push(["Experiência profissional", curriculo.experiencias.flatMap((item) => [`${item.cargo}${item.empresa ? ` — ${item.empresa}` : ""}${item.periodo ? ` (${item.periodo})` : ""}`, ...item.atividades.map((atividade) => `• ${atividade}`)])]);
    const habilidades = [...curriculo.habilidadesTecnicas, ...curriculo.habilidadesComportamentais];
    if (habilidades.length) itens.push(["Habilidades", habilidades]);
    if (curriculo.cursos.length) itens.push(["Cursos e certificações", curriculo.cursos]);
    if (curriculo.idiomas.length) itens.push(["Idiomas", curriculo.idiomas]);
    if (curriculo.projetos.length) itens.push(["Projetos", curriculo.projetos.flatMap((item) => [`${item.nome}${item.tecnologias.length ? ` — ${item.tecnologias.join(", ")}` : ""}`, item.descricao])]);
    return itens;
}

function escapeHtml(valor) {
    return String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function curriculoHtml(curriculo, estilo) {
    const classes = `cv cv-${estilo}`;
    const blocos = secoes(curriculo).map(([titulo, linhas]) => `<section><h2>${escapeHtml(titulo)}</h2>${linhas.map((linha) => `<p>${escapeHtml(linha)}</p>`).join("")}</section>`).join("");
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#20242b;margin:0}.${classes}{max-width:780px;margin:auto}.cv header{padding-bottom:18px;border-bottom:2px solid #243b53}.cv h1{font-size:28px;margin:0 0 5px}.cv .cargo{font-size:15px;color:#52606d}.cv .contato{font-size:11px;color:#52606d;margin-top:8px}.cv section{margin-top:18px}.cv h2{font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#243b53;border-bottom:1px solid #bcccdc;padding-bottom:5px;margin:0 0 8px}.cv p{font-size:11px;line-height:1.45;margin:4px 0}.cv-moderno header{background:#1f7a8c;color:white;padding:24px;border:0}.cv-moderno .cargo,.cv-moderno .contato{color:#e6fffa}.cv-moderno h2{color:#1f7a8c;border-color:#99d5d0}.cv-minimalista header{border:0;padding-bottom:8px}.cv-minimalista h1{font-size:24px;font-weight:500}.cv-minimalista section{margin-top:14px}.cv-minimalista h2{font-size:11px;border:0;color:#616161;padding:0}.cv-minimalista p{font-size:10.5px}
    </style></head><body><main class="${classes}"><header><h1>${escapeHtml(curriculo.nome || "Currículo profissional")}</h1><div class="cargo">${escapeHtml(curriculo.cargoObjetivo)}</div><div class="contato">${escapeHtml(valorContato(curriculo))}</div></header>${blocos}</main></body></html>`;
}

function gerarPdf(curriculo, estilo, resposta) {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resposta(Buffer.concat(chunks)));
    const accent = estilo === "moderno" ? "#1f7a8c" : estilo === "minimalista" ? "#555555" : "#243b53";
    doc.fillColor(accent).fontSize(estilo === "minimalista" ? 24 : 28).text(curriculo.nome || "Currículo profissional");
    doc.fillColor("#52606d").fontSize(11).text(curriculo.cargoObjetivo);
    doc.text(valorContato(curriculo)).moveDown();
    secoes(curriculo).forEach(([titulo, linhas]) => {
        doc.fillColor(accent).fontSize(11).text(titulo.toUpperCase()).moveDown(3);
        doc.fillColor("#20242b").fontSize(10.5);
        linhas.forEach((linha) => doc.text(linha, { lineGap: 2 }));
        doc.moveDown(0.7);
    });
    doc.end();
}

async function gerarDocx(curriculo, estilo) {
    const accent = estilo === "moderno" ? "1F7A8C" : estilo === "minimalista" ? "555555" : "243B53";
    const children = [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: curriculo.nome || "Currículo profissional", bold: true, size: 34, color: accent })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: curriculo.cargoObjetivo, size: 22, color: "52606D" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: valorContato(curriculo), size: 18, color: "52606D" })] })
    ];
    secoes(curriculo).forEach(([titulo, linhas]) => {
        children.push(new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_2, color: accent }));
        linhas.forEach((linha) => children.push(new Paragraph({ text: linha, bullet: linha.startsWith("•") ? { level: 0 } : undefined })));
    });
    return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/gerar-cv", async (req, res) => {
    const entrada = typeof req.body.texto === "string" ? req.body.texto.trim() : "";
    if (!entrada) return res.status(400).json({ erro: "Digite suas informações primeiro." });
    try {
        res.json({ curriculo: await gerarDados(entrada) });
    } catch (erro) {
        console.error("Erro ao gerar currículo:", erro.message);
        res.status(erro.statusCode || 502).json({ erro: erro.statusCode === 503 ? erro.message : "Não foi possível gerar o currículo agora." });
    }
});

app.post("/exportar-cv", async (req, res) => {
    const estilo = STYLES.has(req.body.estilo) ? req.body.estilo : "classico";
    const curriculo = normalizarCurriculo(req.body.curriculo);
    if (!curriculo.nome && !curriculo.resumo && !curriculo.experiencias.length) return res.status(400).json({ erro: "Currículo inválido para exportação." });
    try {
        if (req.body.formato === "pdf") {
            gerarPdf(curriculo, estilo, (buffer) => {
                res.type("pdf").set("Content-Disposition", `attachment; filename="curriculo-${estilo}.pdf"`).send(buffer);
            });
            return;
        }
        if (req.body.formato === "docx") {
            const buffer = await gerarDocx(curriculo, estilo);
            res.type("docx").set("Content-Disposition", `attachment; filename="curriculo-${estilo}.docx"`).send(buffer);
            return;
        }
        res.status(400).json({ erro: "Formato de exportação inválido." });
    } catch (erro) {
        console.error("Erro ao exportar currículo:", erro.message);
        res.status(500).json({ erro: "Não foi possível exportar o currículo." });
    }
});

app.listen(PORT, "127.0.0.1", () => console.log(`Servidor rodando em http://localhost:${PORT}`));
