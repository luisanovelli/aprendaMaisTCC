(() => {

    "use strict";

    const body = document.body;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    /* ===== ARMAZENAMENTO ===== */

    function lerTexto(chave) {
        try { return localStorage.getItem(chave); } catch { return null; }
    }

    function gravarTexto(chave, valor) {
        try { localStorage.setItem(chave, valor); return true; } catch { return false; }
    }

    function removerChave(chave) {
        try { localStorage.removeItem(chave); } catch { /* ignora */ }
    }

    function lerJSON(chave, padrao) {
        try {
            const valor = JSON.parse(localStorage.getItem(chave));
            return valor ?? padrao;
        } catch {
            return padrao;
        }
    }

    function gravarJSON(chave, valor) {
        return gravarTexto(chave, JSON.stringify(valor));
    }

    const plural = (n, singular, pluralTexto) =>
        `${n} ${n === 1 ? singular : pluralTexto}`;

    /* ===== TEMA ===== */

    const themeButton = document.getElementById("theme-toggle");

    const temaSalvo = lerTexto("theme");

    if (
        temaSalvo === "dark" ||
        (!temaSalvo && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
        body.classList.add("dark-mode");
    }

    function atualizarBotaoTema() {

        if (!themeButton) return;

        const dark = body.classList.contains("dark-mode");

        themeButton.textContent = dark ? "☀" : "☾";

        const rotulo = dark ? "Ativar tema claro" : "Ativar tema escuro";

        themeButton.setAttribute("aria-label", rotulo);
        themeButton.title = rotulo;

    }

    function definirTema(escuro) {

        body.classList.toggle("dark-mode", escuro);

        gravarTexto("theme", escuro ? "dark" : "light");

        atualizarBotaoTema();

    }

    atualizarBotaoTema();

    themeButton?.addEventListener("click", () => {

        definirTema(!body.classList.contains("dark-mode"));

        themeButton.classList.remove("animar");

        requestAnimationFrame(() => {
            themeButton.classList.add("animar");
        });

    });

    /* ===== CONTA / SESSÃO ===== */

    const CHAVE_USUARIO = "usuario";
    const CHAVE_SESSAO = "sessaoUsuario";

    const lerUsuario = () => lerJSON(CHAVE_USUARIO, null);

    const salvarUsuario = dados => gravarJSON(CHAVE_USUARIO, dados);

    const sessaoAtiva = () => lerTexto(CHAVE_SESSAO) === "ativa";

    function usuarioLogado() {
        const usuario = lerUsuario();
        return usuario && sessaoAtiva() ? usuario : null;
    }

    function ehProfessor(usuario) {
        return usuario?.tipo === "professor";
    }

    function paginaDoPerfil(usuario) {
        return ehProfessor(usuario) ? "perfilprof.html" : "perfil.html";
    }

    const logado = usuarioLogado();

    // O menu "Perfil" leva cada pessoa para o perfil do seu tipo de conta

    if (logado) {

        document.querySelectorAll(
            'nav a[href="perfil.html"], nav a[href="perfilprof.html"]'
        ).forEach(link => {
            link.setAttribute("href", paginaDoPerfil(logado));
        });

        // Quem já tem conta não precisa voltar ao cadastro

        document.querySelectorAll('.botao-principal[href="login.html"]')
            .forEach(link => {
                link.setAttribute("href", "cursos.html");
            });

    }

    /* ===== HASH DE SENHA ===== */
    // A senha nunca é guardada; só um hash com sal.
    // Observação: sem servidor isso é apenas uma simulação de login.

    const paraHex = bytes =>
        [...new Uint8Array(bytes)]
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

    const hashDisponivel = () =>
        !!(window.crypto && crypto.subtle && crypto.getRandomValues);

    const gerarSal = () => paraHex(crypto.getRandomValues(new Uint8Array(16)));

    async function gerarHash(senha, sal) {
        const dados = new TextEncoder().encode(`${sal}:${senha}`);
        return paraHex(await crypto.subtle.digest("SHA-256", dados));
    }

    function gerarCodigoTurma() {

        const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const sorteio = crypto.getRandomValues(new Uint8Array(5));

        return "APR-" + [...sorteio]
            .map(n => letras[n % letras.length])
            .join("");

    }

    /* ===== LOGIN / CADASTRO ===== */

    const formCadastro = document.getElementById("form-cadastro");
    const formEntrar = document.getElementById("form-entrar");

    function mensagem(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    function mostrarModo(modo) {

        if (!formCadastro || !formEntrar) return;

        const entrar = modo === "entrar";

        formCadastro.hidden = entrar;
        formEntrar.hidden = !entrar;

        const titulo = document.getElementById("login-titulo");

        titulo.textContent = entrar ? "Entrar na " : "Criar ";

        const destaque = document.createElement("span");
        destaque.textContent = "conta";
        titulo.appendChild(destaque);

        document.getElementById("login-etiqueta").textContent =
            entrar ? "BEM-VINDO DE VOLTA" : "COMECE AGORA";

        document.getElementById("login-subtitulo").textContent = entrar
            ? "Use o e-mail e a senha que você cadastrou neste navegador."
            : "Preencha os dados abaixo para montar o seu perfil.";

        document.getElementById("alternar-texto").textContent =
            entrar ? "Ainda não tem conta?" : "Já tem uma conta?";

        document.getElementById("alternar-botao").textContent =
            entrar ? "Criar conta" : "Entrar";

        mensagem("mensagem-cadastro", "");
        mensagem("mensagem-entrar", "");

    }

    if (formCadastro && formEntrar) {

        mostrarModo(location.hash === "#entrar" ? "entrar" : "cadastro");

        document.getElementById("alternar-botao")
            .addEventListener("click", () => {
                mostrarModo(formEntrar.hidden ? "entrar" : "cadastro");
            });

    }

    formCadastro?.addEventListener("submit", async event => {

        event.preventDefault();

        const tipo = formCadastro.tipoUsuario.value;
        const nomeUsuario = formCadastro.nomeUsuario.value.trim();
        const email = formCadastro.email.value.trim().toLowerCase();
        const senha = formCadastro.senha.value;

        if (tipo !== "aluno" && tipo !== "professor") {
            mensagem("mensagem-cadastro", "Escolha se você é aluno(a) ou professor(a).");
            return;
        }

        if (nomeUsuario.length < 3) {
            mensagem("mensagem-cadastro", "O nome de usuário precisa ter pelo menos 3 caracteres.");
            return;
        }

        if (senha.length < 6) {
            mensagem("mensagem-cadastro", "A senha precisa ter pelo menos 6 caracteres.");
            return;
        }

        if (!hashDisponivel()) {
            mensagem("mensagem-cadastro", "Este navegador não permite proteger a senha. Abra o site por localhost ou HTTPS.");
            return;
        }

        const existente = lerUsuario();

        if (
            existente &&
            !confirm(`Já existe a conta @${existente.nomeUsuario} neste navegador. Substituir por uma nova?`)
        ) {
            return;
        }

        const sal = gerarSal();

        const novo = {
            tipo,
            nomeUsuario,
            email,
            sal,
            senhaHash: await gerarHash(senha, sal),
            xp: 50,
            diasConsecutivos: 0,
            amigos: 0,
            professores: 0
        };

        if (tipo === "professor") {
            novo.codigoTurma = gerarCodigoTurma();
        }

        if (!salvarUsuario(novo)) {
            mensagem("mensagem-cadastro", "Não foi possível salvar seus dados neste navegador.");
            return;
        }

        // Conta nova começa sem turma/amigos antigos

        removerChave("alunosProf");
        removerChave("amigosProf");

        gravarTexto(CHAVE_SESSAO, "ativa");

        window.location.href = paginaDoPerfil(novo);

    });

    formEntrar?.addEventListener("submit", async event => {

        event.preventDefault();

        const email = formEntrar.email.value.trim().toLowerCase();
        const senha = formEntrar.senha.value;

        const usuario = lerUsuario();

        if (!usuario) {
            mensagem("mensagem-entrar", "Nenhuma conta encontrada neste navegador. Crie uma conta primeiro.");
            return;
        }

        if (!usuario.senhaHash || !usuario.sal) {
            mensagem("mensagem-entrar", "Esta conta é antiga e não tem senha salva. Crie a conta novamente.");
            return;
        }

        if (!hashDisponivel()) {
            mensagem("mensagem-entrar", "Este navegador não permite verificar a senha. Abra o site por localhost ou HTTPS.");
            return;
        }

        const confere =
            email === usuario.email &&
            (await gerarHash(senha, usuario.sal)) === usuario.senhaHash;

        if (!confere) {
            mensagem("mensagem-entrar", "E-mail ou senha incorretos.");
            return;
        }

        gravarTexto(CHAVE_SESSAO, "ativa");

        window.location.href = paginaDoPerfil(usuario);

    });

    // Botão para sair da conta

    document.getElementById("botao-sair")?.addEventListener("click", () => {

        if (confirm("Deseja realmente sair da sua conta?")) {
            removerChave(CHAVE_SESSAO);
            window.location.href = "login.html#entrar";
        }

    });

    /* ===== GATO DO PERFIL ===== */

    const CHAVE_GATO = "gatoPerfil";
    const GATO_PADRAO = "vermelho";
    const IMAGEM_RESERVA = "gato.png";

    const GATOS = {
        vermelho: "Vermelho",
        preto: "Preto",
        cinza: "Cinza",
        azul: "Azul",
        rosa: "Rosa",
        amarelo: "Amarelo",
        verde: "Verde",
        roxo: "Roxo"
    };

    function lerGato() {
        const salvo = lerTexto(CHAVE_GATO);
        return salvo && salvo in GATOS ? salvo : GATO_PADRAO;
    }

    const avatar = document.getElementById("perfil-avatar");
    const seletorGato = document.getElementById("seletor-gato");
    const avisoGato = document.getElementById("aviso-gato");

    // Se a imagem do gato não existir, usa a imagem reserva (uma vez só)

    document.querySelectorAll(".avatar, .opcao-imagem img").forEach(img => {
        img.addEventListener("error", () => {
            if (img.dataset.reserva) return;
            img.dataset.reserva = "1";
            img.src = IMAGEM_RESERVA;
        });
    });

    function mostrarGato(gato) {

        if (!avatar) return;

        avatar.dataset.reserva = "";
        avatar.src = `gatos/gato-${gato}.png`;
        avatar.alt = `Gato ${GATOS[gato].toLowerCase()} de programação`;

    }

    function iniciarSeletorGato() {

        if (!avatar || !seletorGato) return;

        const atual = lerGato();

        mostrarGato(atual);

        const opcaoAtual = seletorGato.querySelector(`input[value="${atual}"]`);

        if (opcaoAtual) opcaoAtual.checked = true;

        seletorGato.addEventListener("change", event => {

            const gato = event.target.value;

            if (!(gato in GATOS)) return;

            mostrarGato(gato);

            const ok = gravarTexto(CHAVE_GATO, gato);

            if (avisoGato) {
                avisoGato.textContent = ok
                    ? `Gato ${GATOS[gato].toLowerCase()} selecionado.`
                    : "Gato alterado, mas não foi possível salvar neste navegador.";
            }

            avatar.classList.remove("trocou");

            requestAnimationFrame(() => {
                avatar.classList.add("trocou");
            });

        });

        avatar.addEventListener("animationend", () => {
            avatar.classList.remove("trocou");
        });

    }

    /* ===== PERFIL DO ALUNO ===== */

    function iniciarPerfilAluno() {

        const usuario = usuarioLogado();

        const perfilSemConta = document.getElementById("perfil-sem-conta");
        const perfilComConta = document.getElementById("perfil-com-conta");

        const conteudosPerfil = [
            "conteudo-perfil-gato",
            "conteudo-perfil-estatisticas",
            "conteudo-perfil-habilidades",
            "conteudo-perfil-conexoes"
        ];

        // Professor logado não usa o perfil de aluno

        if (ehProfessor(usuario)) {
            window.location.replace("perfilprof.html");
            return;
        }

        const temConta = !!usuario;

        perfilSemConta.hidden = temConta;
        perfilComConta.hidden = !temConta;

        conteudosPerfil.forEach(id => {
            document.getElementById(id).hidden = !temConta;
        });

        if (!temConta) return;

        document.getElementById("perfil-nome").textContent =
            "@" + usuario.nomeUsuario;

        document.getElementById("perfil-email").textContent = usuario.email;

        document.getElementById("perfil-conexoes").textContent =
            `${plural(usuario.amigos ?? 0, "amigo", "amigos")} · ` +
            plural(usuario.professores ?? 0, "professor", "professores");

        document.getElementById("perfil-dias").textContent =
            usuario.diasConsecutivos ?? 0;

        document.getElementById("perfil-xp").textContent =
            (usuario.xp ?? 0) + " XP";

        iniciarSeletorGato();

    }

    /* ===== PERFIL DO PROFESSOR ===== */

    const CHAVE_ALUNOS = "alunosProf";
    const CHAVE_AMIGOS = "amigosProf";
    const CURSOS_TURMA = ["HTML", "CSS", "JAVA"];

    function criar(tag, atributos = {}, ...filhos) {

        const el = document.createElement(tag);

        Object.entries(atributos).forEach(([nome, valor]) => {
            if (nome === "texto") el.textContent = valor;
            else el.setAttribute(nome, valor);
        });

        filhos.forEach(filho => el.append(filho));

        return el;

    }

    const limitarProgresso = valor => {
        const n = Math.round(Number(valor));
        return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
    };

    /* ===== AVATAR DO PROFESSOR ===== */

    const AVATARES_PROFESSOR = {
        professora: "gatos/gatoProfessora.png",
        professor: "gatos/gatoProfessor.png"
    };

    const CHAVE_AVATAR_PROFESSOR = "avatarProfessor";

    function lerAvatarProfessor() {
        const salvo = localStorage.getItem(CHAVE_AVATAR_PROFESSOR);

        if (salvo && AVATARES_PROFESSOR[salvo]) {
            return salvo;
        }

        return "professora";
    }

    function atualizarAvatarProfessor() {
        const avatar = lerAvatarProfessor();
        const imagem = document.getElementById("perfil-avatar");

        if (imagem) {
            imagem.src = AVATARES_PROFESSOR[avatar];
            imagem.alt = avatar === "professora"
                ? "Gatinha professora"
                : "Gatinho professor";
        }

        document.querySelectorAll('input[name="avatarProfessor"]').forEach(opcao => {
            opcao.checked = opcao.value === avatar;
        });
    }

    function iniciarSeletorAvatarProfessor() {
        atualizarAvatarProfessor();

        document.querySelectorAll('input[name="avatarProfessor"]').forEach(opcao => {
            opcao.addEventListener("change", function () {
                localStorage.setItem(CHAVE_AVATAR_PROFESSOR, this.value);

                atualizarAvatarProfessor();

                const aviso = document.getElementById("aviso-avatar-professor");

                if (aviso) {
                    aviso.textContent = "Avatar atualizado com sucesso!";
                }
            });
        });
    }




    function iniciarPerfilProfessor() {
        iniciarSeletorAvatarProfessor();

        const usuario = usuarioLogado();

        // Sem conta ou conta de aluno: vai para o perfil de aluno,
        // que mostra o convite para criar/entrar na conta

        if (!usuario || !ehProfessor(usuario)) {
            window.location.replace("perfil.html");
            return;
        }

        // Contas de professor antigas ganham um código de turma

        if (!usuario.codigoTurma && hashDisponivel()) {
            usuario.codigoTurma = gerarCodigoTurma();
            salvarUsuario(usuario);
        }

        document.getElementById("conteudo-professor").hidden = false;

        document.getElementById("perfil-nome").textContent =
            "@" + usuario.nomeUsuario;

        document.getElementById("perfil-email").textContent = usuario.email;

        document.getElementById("prof-codigo").textContent =
            usuario.codigoTurma ?? "----";

        let alunos = lerJSON(CHAVE_ALUNOS, []);
        let amigos = lerJSON(CHAVE_AMIGOS, []);

        if (!Array.isArray(alunos)) alunos = [];
        if (!Array.isArray(amigos)) amigos = [];

        const listaAlunos = document.getElementById("lista-alunos");
        const listaAmigos = document.getElementById("lista-amigos");

        function salvarAlunos() { gravarJSON(CHAVE_ALUNOS, alunos); }
        function salvarAmigos() { gravarJSON(CHAVE_AMIGOS, amigos); }

        function mediaDe(lista) {
            if (!lista.length) return 0;
            const soma = lista.reduce((t, a) => t + a.progresso, 0);
            return Math.round(soma / lista.length);
        }

        function atualizarResumo() {

            document.getElementById("perfil-conexoes").textContent =
                `${plural(amigos.length, "amigo", "amigos")} · ` +
                plural(alunos.length, "aluno", "alunos");

            document.getElementById("prof-total-alunos").textContent = alunos.length;
            document.getElementById("prof-media").textContent = mediaDe(alunos) + "%";
            document.getElementById("total-alunos-conexao").textContent = alunos.length;
            document.getElementById("total-amigos").textContent = amigos.length;

            document.getElementById("vazio-alunos").hidden = alunos.length > 0;

            const area = document.getElementById("desempenho-cursos");

            area.replaceChildren();

            CURSOS_TURMA.forEach(curso => {

                const doCurso = alunos.filter(a => a.curso === curso);
                const media = mediaDe(doCurso);

                const barra = criar("span");
                barra.style.width = media + "%";

                area.append(
                    criar("p", { class: "linha-progresso" },
                        criar("span", { texto: `${curso} · ${plural(doCurso.length, "aluno", "alunos")}` }),
                        criar("strong", { texto: media + "%" })
                    ),
                    criar("div", { class: "barra-progresso" }, barra)
                );

            });

        }

        function itemAluno(aluno) {

            const barra = criar("span");
            barra.style.width = aluno.progresso + "%";

            const trilho = criar("div", {
                class: "barra-progresso",
                role: "progressbar",
                "aria-label": `Progresso de ${aluno.nome}`,
                "aria-valuemin": "0",
                "aria-valuemax": "100",
                "aria-valuenow": String(aluno.progresso)
            }, barra);

            const campo = criar("input", {
                type: "number",
                min: "0",
                max: "100",
                value: String(aluno.progresso),
                inputmode: "numeric",
                "aria-label": `Progresso de ${aluno.nome} em porcentagem`
            });

            campo.addEventListener("change", () => {

                aluno.progresso = limitarProgresso(campo.value);

                campo.value = aluno.progresso;
                barra.style.width = aluno.progresso + "%";
                trilho.setAttribute("aria-valuenow", String(aluno.progresso));

                salvarAlunos();
                atualizarResumo();

            });

            const remover = criar("button", {
                type: "button",
                class: "botao-remover",
                "aria-label": `Remover ${aluno.nome}`,
                title: "Remover aluno",
                texto: "×"
            });

            remover.addEventListener("click", () => {

                if (!confirm(`Remover ${aluno.nome} da turma?`)) return;

                alunos = alunos.filter(a => a.id !== aluno.id);

                salvarAlunos();
                renderAlunos();

            });

            return criar("li", { class: "aluno-item" },
                criar("span", { class: "aluno-inicial", "aria-hidden": "true", texto: aluno.nome.charAt(0).toUpperCase() }),
                criar("div", { class: "aluno-info" },
                    criar("strong", { texto: aluno.nome }),
                    criar("span", { class: "curso-tag", texto: aluno.curso })
                ),
                criar("label", { class: "progresso-edit" }, campo, "%"),
                remover,
                trilho
            );

        }

        function renderAlunos() {

            listaAlunos.replaceChildren(...alunos.map(itemAluno));

            atualizarResumo();

        }

        function itemAmigo(nome, indice) {

            const remover = criar("button", {
                type: "button",
                class: "botao-remover",
                "aria-label": `Remover ${nome}`,
                title: "Remover amigo",
                texto: "×"
            });

            remover.addEventListener("click", () => {
                amigos.splice(indice, 1);
                salvarAmigos();
                renderAmigos();
            });

            return criar("li", { class: "aluno-item aluno-item-simples" },
                criar("span", { class: "aluno-inicial", "aria-hidden": "true", texto: nome.charAt(0).toUpperCase() }),
                criar("div", { class: "aluno-info" }, criar("strong", { texto: nome })),
                remover
            );

        }

        function renderAmigos() {

            listaAmigos.replaceChildren(...amigos.map(itemAmigo));

            atualizarResumo();

        }

        // Adicionar aluno

        const formAluno = document.getElementById("form-aluno");

        formAluno.addEventListener("submit", event => {

            event.preventDefault();

            const aviso = document.getElementById("aviso-aluno");

            const nome = document.getElementById("aluno-nome").value.trim();
            const curso = document.getElementById("aluno-curso").value;
            const progresso = limitarProgresso(
                document.getElementById("aluno-progresso").value
            );

            if (nome.length < 2) {
                aviso.textContent = "Digite o nome do aluno (mínimo 2 letras).";
                return;
            }

            if (!CURSOS_TURMA.includes(curso)) {
                aviso.textContent = "Escolha um curso válido.";
                return;
            }

            const repetido = alunos.some(
                a => a.curso === curso && a.nome.toLowerCase() === nome.toLowerCase()
            );

            if (repetido) {
                aviso.textContent = `${nome} já está na turma de ${curso}.`;
                return;
            }

            alunos.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                nome,
                curso,
                progresso
            });

            salvarAlunos();

            aviso.textContent = `${nome} foi adicionado(a) à turma de ${curso}.`;

            formAluno.reset();

            renderAlunos();

            document.getElementById("aluno-nome").focus();

        });

        // Adicionar amigo

        const formAmigo = document.getElementById("form-amigo");

        formAmigo.addEventListener("submit", event => {

            event.preventDefault();

            const aviso = document.getElementById("aviso-amigo");
            const nome = document.getElementById("amigo-nome").value.trim();

            if (nome.length < 2) {
                aviso.textContent = "Digite o nome do colega (mínimo 2 letras).";
                return;
            }

            if (amigos.some(a => a.toLowerCase() === nome.toLowerCase())) {
                aviso.textContent = `${nome} já está nos seus amigos.`;
                return;
            }

            amigos.push(nome);

            salvarAmigos();

            aviso.textContent = `${nome} foi adicionado(a) aos amigos.`;

            formAmigo.reset();

            renderAmigos();

            document.getElementById("amigo-nome").focus();

        });

        // Copiar código da turma

        document.getElementById("botao-copiar").addEventListener("click", async () => {

            const codigo = usuario.codigoTurma;
            const aviso = document.getElementById("aviso-codigo");

            if (!codigo) return;

            try {
                await navigator.clipboard.writeText(codigo);
                aviso.textContent = `Código ${codigo} copiado.`;
            } catch {
                aviso.textContent = `Copie manualmente: ${codigo}`;
            }

        });

        renderAlunos();
        renderAmigos();

        iniciarSeletorGato();

    }

    const tipoPagina = body.dataset.perfil;

    if (tipoPagina === "aluno") iniciarPerfilAluno();
    if (tipoPagina === "professor") iniciarPerfilProfessor();

    /* ===== ACESSIBILIDADE ===== */

    const CHAVE_ACESSIBILIDADE = "acessibilidade";

    const CLASSES_ACESSIBILIDADE = {
        teclado: "nav-teclado",
        autismo: "cog-autismo",
        tdah: "cog-tdah",
        cor: "alto-contraste"
    };

    const acess = lerJSON(CHAVE_ACESSIBILIDADE, {});

    const salvarAcess = () => gravarJSON(CHAVE_ACESSIBILIDADE, acess);

    const temFala = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    const Reconhecimento =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    function aplicarClasses() {

        Object.entries(CLASSES_ACESSIBILIDADE).forEach(([recurso, classe]) => {
            body.classList.toggle(classe, !!acess[recurso]);
        });

    }

    // Leitor de texto

    let ultimoLido = null;

    function textoParaLer(alvo) {

        if (!(alvo instanceof Element)) return "";

        const el = alvo.closest(
            "h1, h2, h3, p, a, button, label, legend, li, select, input, .status"
        );

        if (!el) return "";

        if (el.matches("input, select")) {
            const rotulo = el.labels?.[0]?.textContent || el.placeholder || el.name;
            return (rotulo || "").trim();
        }

        return (el.getAttribute("aria-label") || el.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300);

    }

    function lerEmVoz(event) {

        const el = event.target instanceof Element
            ? event.target.closest("h1, h2, h3, p, a, button, label, legend, li, select, input, .status")
            : null;

        if (!el || el === ultimoLido) return;

        const texto = textoParaLer(el);

        if (!texto) return;

        ultimoLido = el;

        speechSynthesis.cancel();

        const fala = new SpeechSynthesisUtterance(texto);

        fala.lang = "pt-BR";

        speechSynthesis.speak(fala);

    }

    function ligarLeitor(ligado) {

        if (!temFala) return;

        document.removeEventListener("focusin", lerEmVoz);
        document.removeEventListener("mouseover", lerEmVoz);

        if (ligado) {
            document.addEventListener("focusin", lerEmVoz);
            document.addEventListener("mouseover", lerEmVoz);
        } else {
            speechSynthesis.cancel();
            ultimoLido = null;
        }

    }

    // Comando de voz

    let reconhecedor = null;

    const semAcento = texto =>
        texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    function executarComando(frase) {

        const texto = semAcento(frase);

        const destinos = [
            [/acessibilidade/, "acessibilidade.html"],
            [/cursos?/, "cursos.html"],
            [/perfil/, paginaDoPerfil(logado)],
            [/inicio|home|pagina inicial/, "index.html"],
            [/entrar|login|cadastr|criar conta/, "login.html"]
        ];

        if (/tema escuro|modo escuro/.test(texto)) return definirTema(true);
        if (/tema claro|modo claro/.test(texto)) return definirTema(false);

        const achado = destinos.find(([regra]) => regra.test(texto));

        if (achado) window.location.href = achado[1];

    }

    function ligarVoz(ligado) {

        if (!Reconhecimento) return;

        if (!ligado) {
            const anterior = reconhecedor;
            reconhecedor = null;
            anterior?.stop();
            return;
        }

        if (reconhecedor) return;

        const rec = new Reconhecimento();

        rec.lang = "pt-BR";
        rec.continuous = true;
        rec.interimResults = false;

        rec.onresult = event => {
            const ultimo = event.results[event.results.length - 1];
            executarComando(ultimo[0].transcript);
        };

        rec.onerror = event => {

            // Microfone negado: desliga o recurso em vez de ficar tentando

            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                reconhecedor = null;
                acess.voz = false;
                salvarAcess();
                atualizarPainel();
            }

        };

        rec.onend = () => {
            if (reconhecedor === rec && acess.voz) {
                try { rec.start(); } catch { /* já está ouvindo */ }
            }
        };

        reconhecedor = rec;

        try { rec.start(); } catch { reconhecedor = null; }

    }

    // Painel da página de acessibilidade

    const cartoesRecurso = document.querySelectorAll("[data-recurso]");

    function atualizarPainel() {

        cartoesRecurso.forEach(cartao => {

            const recurso = cartao.dataset.recurso;
            const botao = cartao.querySelector(".alternador");
            const status = cartao.querySelector(".status");

            const indisponivel =
                (recurso === "leitor" && !temFala) ||
                (recurso === "voz" && !Reconhecimento);

            const ligado = !!acess[recurso] && !indisponivel;

            botao.setAttribute("aria-checked", String(ligado));
            botao.disabled = indisponivel;

            status.textContent = indisponivel
                ? "Indisponível neste navegador"
                : ligado ? "Ativado" : "Desativado";

            status.classList.toggle("status-on", ligado);
            status.classList.toggle("status-off", !ligado);

        });

    }

    cartoesRecurso.forEach(cartao => {

        cartao.querySelector(".alternador").addEventListener("click", () => {

            const recurso = cartao.dataset.recurso;

            acess[recurso] = !acess[recurso];

            salvarAcess();
            aplicarClasses();

            if (recurso === "leitor") ligarLeitor(acess.leitor);
            if (recurso === "voz") ligarVoz(acess.voz);

            atualizarPainel();

        });

    });

    aplicarClasses();
    ligarLeitor(!!acess.leitor);
    ligarVoz(!!acess.voz);
    atualizarPainel();

    /* ===== ANIMAÇÕES ===== */

    const items = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window && !reduceMotion) {

        const observer = new IntersectionObserver((entries, obs) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visivel");

                    obs.unobserve(entry.target);

                }

            });

        }, {
            threshold: 0.12
        });

        items.forEach(item => observer.observe(item));

    } else {

        items.forEach(item => {
            item.classList.add("visivel");
        });

    }

    if (
        !reduceMotion &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {

        document.querySelectorAll(
            ".cartao-curso:not(.escolha-gato):not(.cartao-turma):not(.conexoes), .cartao-recurso, .estatisticas > div"
        ).forEach(card => {

            card.addEventListener("pointermove", event => {

                if (body.classList.contains("cog-autismo")) return;

                const rect = card.getBoundingClientRect();

                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;

                card.style.transform =
                    `perspective(850px) rotateX(${-y * 2.5}deg) rotateY(${x * 2.5}deg) translateY(-4px)`;

            });

            card.addEventListener("pointerleave", () => {

                card.style.transform = "";

            });

        });

    }

})();
