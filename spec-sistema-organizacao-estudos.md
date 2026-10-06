# Spec — Sistema de organização de estudos e rotina

## 1. Visão geral

Sistema (mobile + web) que ajuda estudantes a organizar sua rotina de estudos de forma que **se adapta automaticamente** quando o plano não é seguido, em vez de exigir disciplina perfeita. O diferencial central não é gerar um cronograma — é o que acontece quando o estudante falha um dia.

## 2. Problema que resolve

- Cronogramas de estudo são estáticos: quando a pessoa falha um dia, o plano "quebra" e ela abandona.
- Revisão espaçada (repetir conteúdo pra não esquecer) exige esforço manual que quase ninguém mantém.
- O estudante não sabe se está no ritmo certo até a prova acontecer.
- Tempo estudado não é comparado com resultado real, então esforço mal direcionado passa despercebido.

## 3. Público-alvo

- Estudantes se preparando para vestibular, ENEM ou concursos.
- Secundário (fase futura): alunos de ensino médio/fundamental com apoio dos pais, e universitários organizando múltiplas disciplinas.

## 4. Escopo por fase

### Fase 1 — MVP (validado no teste manual)
- Cadastro de matérias, data da prova e horas disponíveis por dia
- Geração automática de cronograma
- Replanejamento automático quando o estudante falha um dia
- Revisão espaçada automática (lembrete de rever conteúdo já estudado)
- Indicador simples de ritmo ("no prazo" / "atrasado")

### Fase 2 — Desempenho e motivação
- Simulados e exercícios integrados
- Cruzamento de tempo estudado x taxa de acerto por matéria
- Sequência de dias estudando (streak) e histórico de progresso
- Recomendação de realocar tempo entre matérias

### Fase 3 — Expansão
- Modo colaborativo (grupo de estudos)
- Painel para pais/responsáveis acompanharem
- Integração com conteúdo (vídeos, resumos, banco de questões)
- Versão para professores atribuírem cronogramas a turmas

## 5. Requisitos funcionais (Fase 1 — MVP)

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RF01 | Onboarding | Usuário informa matérias, data da prova, horas/dia disponíveis |
| RF02 | Geração de cronograma | Sistema distribui o conteúdo das matérias ao longo dos dias disponíveis até a prova |
| RF03 | Registro de estudo | Usuário marca cada sessão como concluída, parcial ou não feita |
| RF04 | Replanejamento automático | Ao detectar sessão não feita, o sistema redistribui o conteúdo pendente nos dias seguintes sem intervenção manual |
| RF05 | Revisão espaçada | Sistema agenda automaticamente revisões de conteúdo já estudado em intervalos crescentes (ex.: 1, 3, 7, 15 dias) |
| RF06 | Indicador de ritmo | Tela inicial mostra se o usuário está em dia, atrasado ou adiantado em relação ao plano até a prova |
| RF07 | Notificações | Lembrete diário do que estudar e alerta quando o plano é ajustado |

## 6. Requisitos funcionais (Fase 2)

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RF08 | Registro de resultado | Usuário insere nota/acertos de simulados por matéria |
| RF09 | Análise tempo x resultado | Sistema cruza horas estudadas com desempenho e sinaliza matérias com baixo retorno |
| RF10 | Gamificação leve | Sequência de dias estudando, marcos de progresso |

## 7. Requisitos não funcionais

- Disponível em mobile (iOS/Android) e web, com dados sincronizados entre plataformas
- Funcionar offline para marcar sessões de estudo, sincronizando quando houver conexão
- Tempo de resposta do replanejamento deve ser imediato (percebido como instantâneo pelo usuário)
- Dados do usuário (matérias, progresso) devem ser privados e não visíveis a terceiros nesta fase

## 8. Fluxo principal do usuário

1. Usuário se cadastra e informa matérias, data da prova e disponibilidade
2. Sistema gera o cronograma inicial
3. Usuário abre o app diariamente, vê o que estudar hoje (conteúdo novo + revisões)
4. Usuário marca sessões como feitas ou não feitas
5. Se não feita, sistema replaneja automaticamente a semana
6. Indicador de ritmo é atualizado em tempo real

## 9. Modelo de dados (alto nível)

- **Usuário**: id, nome, data da prova, horas disponíveis/dia
- **Matéria**: id, nome, usuário_id, nível de prioridade/dificuldade
- **Tópico**: id, matéria_id, nome, status (pendente, estudado, revisado)
- **Sessão de estudo**: id, tópico_id, data planejada, data realizada, status (feita, parcial, não feita)
- **Revisão**: id, tópico_id, data agendada, status
- (Fase 2) **Resultado**: id, matéria_id, data, percentual de acerto

## 10. Métricas de sucesso

- Retenção na semana 2 (quanto do grupo inicial continua ativo)
- % de sessões marcadas como feitas por semana
- Taxa de abertura do app após uma falha (o replanejamento traz a pessoa de volta?)
- (Fase 2) Correlação entre uso do app e melhora em simulados

## 11. Fora de escopo (por enquanto)

- Conteúdo pedagógico próprio (vídeo-aulas, apostilas)
- Correção automática de redação
- Modelo de monetização (a definir em documento separado)
