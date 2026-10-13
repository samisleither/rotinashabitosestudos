# 🚀 StudyAdapt — Sistema Inteligente de Estudos e Rotina

> Sistema adaptativo de organização de estudos desenvolvido de acordo com a especificação técnica oficial (`spec-sistema-organizacao-estudos.md`).
> 
> **Stack:** HTML5 + PHP + JavaScript (ES6+) + CSS3 (Glassmorphism Dark) + SQLite (PDO).

---

## 📋 Sobre o Projeto

Cronogramas de estudo tradicionais quebram quando o estudante falha um único dia, gerando acúmulo e frustração.  
O **StudyAdapt** resolve isso com um **Motor Adaptativo**: quando você falha ou atrasa um conteúdo, o sistema **replaneja e redistribui automaticamente** as matérias nos dias seguintes em blocos amigáveis sem sobrecarga.

---

## 🛠️ Tecnologias Utilizadas

1. **HTML5**: Estrutura semântica para formulários, dashboard, modais e métricas.
2. **PHP**: Backend completo com sessões nativas (`$_SESSION`), hashing seguro de senhas (`password_hash`), API RESTful (`api.php`) e motor de replanejamento automático.
3. **SQLite via PDO**: Banco de dados relacional leve e sem configuração (`studyadapt.db`), criado automaticamente no primeiro acesso.
4. **JavaScript (ES6+)**: Consumo assíncrono da API via `fetch()`, temporizador Pomodoro em tempo real, gráficos dinâmicos de desempenho em Canvas, e fallback local resiliente.
5. **CSS3**: Interface moderna com tema escuro (Dark Glassmorphism), micro-animações, cards translúcidos e tipografia *Plus Jakarta Sans*.

---

## ⚡ Como Rodar o Sistema

### Opção 1: Rodando com o servidor embutido do PHP (Recomendado)

1. Abra o terminal na pasta do projeto:
   ```powershell
   cd c:\Users\Aluno\Downloads\Pesquisa_sam\Sistema-organiza-o-de-estudos
   ```

2. Inicie o servidor PHP integrado:
   ```powershell
   php -S localhost:8000
   ```

3. Abra o navegador no link:
   👉 **[http://localhost:8000](http://localhost:8000)** (ou [http://localhost:8000/index.php](http://localhost:8000/index.php))

---

### Opção 2: Usando XAMPP ou WampServer

1. Copie a pasta `Sistema-organiza-o-de-estudos` para o diretório `htdocs` do XAMPP (geralmente `C:\xampp\htdocs\studyadapt`).
2. Inicie o serviço **Apache** no painel do XAMPP.
3. Acesse no navegador:
   👉 **`http://localhost/studyadapt/`**

---

### Opção 3: Modo Protótipo Estático (Sem servidor)

Se você não tiver o PHP instalado no momento, pode abrir o arquivo diretamente no navegador:
👉 Duplo clique no arquivo `index.html` (o sistema funcionará com armazenamento no `localStorage`).

---

## 🎯 Cobertura dos Requisitos do Spec

| ID | Requisito | Como foi implementado |
|---|---|---|
| **RF01** | **Onboarding / Cadastro** | Formulário de criação de conta solicitando dados pessoais, meta (ENEM, Medicina, etc.), data da prova e horas diárias disponíveis. |
| **RF02** | **Geração de Cronograma** | Distribuição de tópicos e matérias ao longo dos dias disponíveis no banco de dados e dashboard. |
| **RF03** | **Registro de Estudo** | Botões para marcar sessões como **Concluída**, **Parcial** ou **Não Feita**. |
| **RF04** | **Replanejamento Automático** | **Diferencial central**: ao marcar sessão como não feita ou acionar o botão de replanejar, o motor em PHP recalcula a rotina sem culpa. |
| **RF05** | **Revisão Espaçada** | Sessões concluídas são automaticamente agendadas para revisão em intervalos crescentes (+1d, +3d, +7d, +15d). |
| **RF06** | **Indicador de Ritmo** | Pílula dinâmica no topo indicando se o estudante está *"No Prazo"*, *"Atrasado"* ou *"Adiantado"*. |
| **RF07** | **Notificações** | Banners inteligentes avisando quando o plano foi recalculado. |
| **RF08** | **Registro de Simulados** | Cadastro de notas e taxa de acertos (%) por matéria com histórico completo. |
| **RF09** | **Análise Tempo x Resultado** | Gráfico comparativo gerado em Canvas cruzando rendimento e matérias. |
| **RF10** | **Gamificação / Motivação** | Contador de ofensiva de estudos (*Streak*) em dias seguidos com ícone de fogo 🔥. |
