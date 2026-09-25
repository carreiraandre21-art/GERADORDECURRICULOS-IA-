(function () {
    "use strict";

    var API_URL = "http://localhost:3000";
    var EXAMPLES = {
        ads: "Nome: Ana Beatriz Costa\nCidade: Recife - PE\nE-mail: ana.costa@email.com\nTelefone: (81) 98888-1122\n\nFormação: Análise e Desenvolvimento de Sistemas (em andamento) - Faculdade Senac, 2023 a 2026.\n\nExperiência: Estágio em suporte técnico na Digital Norte (2024-2025). Atendimento a usuários, organização de chamados e apoio na documentação de sistemas internos.\n\nHabilidades: HTML, CSS, JavaScript, Git, lógica de programação, MySQL, comunicação e trabalho em equipe.\n\nCursos: Introdução à programação web, Banco de dados relacional, Git e GitHub.\n\nObjetivo: Conseguir um estágio ou vaga júnior em desenvolvimento de software.",
        ti: "Nome: Rafael Mendes\nCidade: São Paulo - SP\nE-mail: rafael.mendes@email.com\nTelefone: (11) 97777-3344\nLinkedIn: linkedin.com/in/rafaelmendes\n\nFormação: Tecnólogo em Gestão da Tecnologia da Informação - Universidade Anhembi Morumbi, 2019 a 2021.\n\nExperiência: Analista de TI na Horizon Sistemas (2022-atual). Administração de contas, suporte N1/N2, implantação de ferramentas internas e melhoria de processos.\n\nHabilidades: Windows Server, Active Directory, redes, ITIL, PowerShell, Excel avançado, atendimento e documentação.\n\nCursos: CompTIA Network+, Fundamentos de Cloud, Segurança da informação.\n\nObjetivo: Atuar como analista de TI ou analista de infraestrutura.",
        primeiro: "Nome: Lucas Oliveira\nCidade: Belo Horizonte - MG\nE-mail: lucas.oliveira@email.com\nTelefone: (31) 99900-2211\n\nFormação: Ensino médio completo (2024). Início de curso técnico em Informática.\n\nExperiência: Ainda não tenho experiência formal. Participei de projetos da escola, organizei um evento acadêmico e ajudei colegas com planilhas e apresentações.\n\nHabilidades: Pacote Office, organização, pontualidade, comunicação, vontade de aprender, noções de informática.\n\nCursos: Informática básica, Excel para iniciantes, comunicação profissional.\n\nObjetivo: Primeiro emprego na área administrativa ou de atendimento.",
        junior: "Nome: Camila Ferreira\nCidade: Curitiba - PR\nE-mail: camila.ferreira@email.com\nTelefone: (41) 98444-7788\nGitHub: github.com/camilaferreira\n\nFormação: Bacharelado em Ciência da Computação - UTFPR, 2020 a 2024.\n\nExperiência: Desenvolvedora júnior na AppLeste (2024-atual). Criação de páginas, correção de bugs, consumo de APIs e participação em code review.\n\nHabilidades: JavaScript, HTML, CSS, Git, Node.js, consumo de APIs REST, Figma básico.\n\nCursos: JavaScript moderno, Fundamentos de Node.js, Acessibilidade na web.\n\nObjetivo: Vaga de desenvolvedora júnior focada em frontend."
    };

    var textoEl = document.getElementById("texto");
    var contadorEl = document.getElementById("contador-caracteres");
    var btnGerar = document.getElementById("btn-gerar");
    var btnLabel = btnGerar.querySelector(".btn-label");
    var previewEl = document.getElementById("preview");
    var emptyStateEl = document.getElementById("empty-state");
    var acoesEl = document.getElementById("acoes-geracao");
    var statusPreview = document.getElementById("status-preview");
    var toastRegion = document.getElementById("toasts");
    var curriculoAtual = null;
    var gerando = false;

    function escapeHtml(valor) {
        return String(valor || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function mostrarToast(mensagem, tipo) {
        var toast = document.createElement("div");
        toast.className = "toast" + (tipo ? " " + tipo : "");
        toast.textContent = mensagem;
        toastRegion.appendChild(toast);
        window.setTimeout(function () { toast.remove(); }, 3200);
    }

    function atualizarContador() {
        var total = textoEl.value.length;
        contadorEl.textContent = total === 1 ? "1 caractere" : total + " caracteres";
    }

    function linhas(valor) {
        return Array.isArray(valor) ? valor.filter(Boolean) : [];
    }

    function renderizarCurriculo(curriculo) {
        var contato = Object.keys(curriculo.contato || {}).map(function (chave) {
            return curriculo.contato[chave];
        }).filter(Boolean).join(" · ");
        var html = '<div class="cv cv-classico"><header class="cv-identity"><p class="cv-name">' + escapeHtml(curriculo.nome || "Currículo profissional") + '</p>';
        html += '<p class="cv-role">' + escapeHtml(curriculo.cargoObjetivo) + '</p><p class="cv-meta">' + escapeHtml(contato) + "</p></header>";
        function secao(titulo, itens) {
            if (!itens.length) return "";
            return '<section class="cv-section"><h3>' + escapeHtml(titulo) + "</h3>" + itens.map(function (item) {
                return "<p>" + escapeHtml(item) + "</p>";
            }).join("") + "</section>";
        }
        html += secao("Resumo profissional", curriculo.resumo ? [curriculo.resumo] : []);
        html += secao("Formação acadêmica", linhas(curriculo.formacao).map(function (item) { return [item.curso, item.instituicao, item.periodo].filter(Boolean).join(" — "); }));
        html += secao("Experiência profissional", linhas(curriculo.experiencias).reduce(function (acc, item) {
            return acc.concat([[item.cargo, item.empresa, item.periodo].filter(Boolean).join(" — ")].concat(linhas(item.atividades).map(function (atividade) { return "• " + atividade; })));
        }, []));
        html += secao("Habilidades", linhas(curriculo.habilidadesTecnicas).concat(linhas(curriculo.habilidadesComportamentais)));
        html += secao("Cursos e certificações", linhas(curriculo.cursos));
        html += secao("Idiomas", linhas(curriculo.idiomas));
        html += secao("Projetos", linhas(curriculo.projetos).reduce(function (acc, item) {
            return acc.concat([[item.nome, linhas(item.tecnologias).join(", ")].filter(Boolean).join(" — "), item.descricao]);
        }, []));
        return html + "</div>";
    }

    function mostrarVazio() {
        previewEl.innerHTML = "";
        previewEl.appendChild(emptyStateEl);
        emptyStateEl.hidden = false;
        previewEl.classList.remove("has-content");
        acoesEl.hidden = true;
        statusPreview.hidden = true;
        curriculoAtual = null;
    }

    function mostrarCarregando() {
        previewEl.innerHTML = '<div class="preview-loading"><div class="skeleton title"></div><div class="skeleton wide"></div><div class="skeleton mid"></div><div class="skeleton short"></div></div>';
        acoesEl.hidden = true;
        statusPreview.hidden = true;
    }

    function mostrarCurriculo(curriculo) {
        curriculoAtual = curriculo;
        previewEl.innerHTML = renderizarCurriculo(curriculo);
        previewEl.classList.add("has-content");
        acoesEl.hidden = false;
        statusPreview.hidden = false;
    }

    function definirCarregamento(ativo) {
        gerando = ativo;
        btnGerar.disabled = ativo;
        btnGerar.classList.toggle("is-loading", ativo);
        btnLabel.textContent = ativo ? "Gerando..." : "✨ Gerar currículo";
    }

    async function gerarCurriculo() {
        if (gerando) return;
        if (!textoEl.value.trim()) {
            mostrarToast("Digite suas informações antes de gerar o currículo.", "warn");
            textoEl.focus();
            return;
        }
        definirCarregamento(true);
        mostrarCarregando();
        try {
            var response = await fetch(API_URL + "/gerar-cv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: textoEl.value })
            });
            var dados = await response.json();
            if (!response.ok || !dados.curriculo) throw new Error(dados.erro || "Resposta inválida da API.");
            mostrarCurriculo(dados.curriculo);
            mostrarToast("Currículo gerado com sucesso.", "success");
        } catch (erro) {
            console.error(erro);
            mostrarVazio();
            mostrarToast("Não foi possível gerar agora. Verifique a conexão e tente novamente.", "error");
        } finally {
            definirCarregamento(false);
        }
    }

    async function exportar(formato) {
        if (!curriculoAtual) return;
        var estilo = document.getElementById("modelo-download").value;
        try {
            var response = await fetch(API_URL + "/exportar-cv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ curriculo: curriculoAtual, estilo: estilo, formato: formato })
            });
            if (!response.ok) throw new Error("Falha no download.");
            var blob = await response.blob();
            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = url;
            link.download = "curriculo-" + estilo + "." + formato;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            mostrarToast("Download " + formato.toUpperCase() + " iniciado.", "success");
        } catch (erro) {
            console.error(erro);
            mostrarToast("Não foi possível exportar o currículo.", "error");
        }
    }

    function copiarCurriculo() {
        if (!curriculoAtual) return;
        navigator.clipboard.writeText(JSON.stringify(curriculoAtual, null, 2)).then(function () {
            mostrarToast("Dados do currículo copiados.", "success");
        }).catch(function () {
            mostrarToast("Não foi possível copiar.", "error");
        });
    }

    function novoCurriculo() {
        textoEl.value = "";
        atualizarContador();
        mostrarVazio();
        textoEl.focus();
    }

    document.getElementById("btn-copiar").addEventListener("click", copiarCurriculo);
    document.getElementById("btn-baixar-pdf").addEventListener("click", function () { exportar("pdf"); });
    document.getElementById("btn-baixar-docx").addEventListener("click", function () { exportar("docx"); });
    document.getElementById("btn-novo").addEventListener("click", novoCurriculo);
    document.getElementById("btn-novo-header").addEventListener("click", novoCurriculo);
    btnGerar.addEventListener("click", gerarCurriculo);
    textoEl.addEventListener("input", atualizarContador);
    textoEl.addEventListener("keydown", function (evento) {
        if ((evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
            evento.preventDefault();
            gerarCurriculo();
        }
    });
    document.querySelectorAll("[data-example]").forEach(function (botao) {
        botao.addEventListener("click", function () {
            textoEl.value = EXAMPLES[botao.getAttribute("data-example")] || "";
            atualizarContador();
            textoEl.focus();
        });
    });
    atualizarContador();
    mostrarVazio();
})();
