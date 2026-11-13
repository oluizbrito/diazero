# Dia Zero

Jogo de sobrevivência isométrico para navegador (celular e computador).
Você é o Doutor Átila Varela, infectologista aposentado, e tem 7 dias para preparar a casa antes do vírus chegar pelo ar.

## Como rodar

```bash
node server.js     # ou: npm start
```

Abra http://localhost:5173. Não precisa instalar nada: é HTML + Canvas + JavaScript puro (ES modules).

Para testar no celular, abra o endereço de rede local que o servidor mostra no terminal.
No WSL2 talvez seja preciso usar o IP do Windows e liberar a porta 5173 no firewall.

## Estrutura

| Arquivo | O que faz |
|---|---|
| `src/config.js` | Constantes, tempos, preços, itens construíveis, objetos |
| `src/content.js` | Notícias da TV, intro, textos |
| `src/state.js` | Estado inicial (casa, móveis), salvar/carregar (localStorage) |
| `src/world.js` | Mapa: tiles, paredes nas bordas, caminhos (BFS), vedação, andares (`s.world` = andar atual) |
| `src/floors.js` | Sótão e bunker: criação, sincronia com o térreo, troca de andar |
| `src/rooms.js` | Cômodos (detecção automática) e luz de cada um |
| `src/attention.js` | Atenção dos zumbis: luz vazando + barulho |
| `src/neighbors.js` | Vizinhança: famílias, endereços, relação com o Dr. |
| `src/siege.js` | Resistência de portas, janelas e cercas contra zumbis |
| `src/time.js` | Relógio, dias, energia/água/lojas |
| `src/sim.js` | Passagem do tempo, necessidades, eventos diários, Dia 0, contaminação |
| `src/events.js` | Eventos aleatórios: visitas à porta, dilemas, imprevistos e consequências futuras |
| `src/eastereggs.js` | Segredos: códigos no teclado, objetos, rádio, rodapé da TV, eventos e lista no Menu |
| `src/tutorial.js` | Abertura cinematográfica e "Primeiros passos" |
| `src/voice.js` | Narração e vozes dos personagens (síntese de voz do navegador, pt-BR), desligadas por padrão |
| `src/sfx.js` | Som todo sintetizado (Web Audio): ambiente, ações, zumbis, interface; volume e mudo |
| `src/player.js` | Movimento e tarefas do personagem |
| `src/actions.js` | Ações (comer, dormir, vedar, plantar, construir...) |
| `src/build.js` | Modo construção: posicionar, validar, demolir |
| `src/npc.js` | Moradores + zumbis: rondar, forçar aberturas, derrubar cercas, invadir e caçar |
| `src/citizens.js` | Moradores: casas, lugares (padaria, mercado…), perfis e rotinas diárias |
| `src/city.js` | Cidade gerada: quarteirões, ruas, faixas de pedestre, praças |
| `src/traffic.js` | Viaturas policiais circulando |
| `src/light.js` | Noite, luzes da casa, postes, janelas |
| `src/mood.js` | Tensão crescente até o Dia 0 (cor, chuva, incêndios, sirenes) |
| `src/tv.js` | Plantão de notícias na TV |
| `src/icons.js` | Ícones de traço |
| `src/draw.js` | Primitivas isométricas, paredes (cortinas, quadros, reforços) e objetos básicos |
| `src/people.js` | Personagens: esqueleto com cotovelo/joelho, vista de costas, estilos por perfil, zumbis, poses e reações às necessidades |
| `src/furniture.js` | Móveis da casa (cozinha, jantar, escritório, sala, quarto, banheiro, lavanderia) |
| `src/render.js` | Cena completa com ordenação por profundidade |
| `src/ui.js` | HUD, menus, lojas, modais |
| `src/main.js` | Loop, câmera, toque/mouse |

## Regras atuais (v0.1)

- Começa no **Dia -7, 08:00**. O vírus chega no **Dia 0 ao meio-dia**.
- Antes disso: lojas abertas das 07h às 21h (cada viagem leva 3h). Os preços sobem 10% por dia.
- A rede elétrica cai no **Dia 1** e a água encanada no **Dia 2**.
- Depois do Dia 0 não dá para sair: estar fora ao meio-dia ou sair de casa = virar zumbi.
- **Vedação:** buracos sem parede (+8%/h) e janelas/portas não vedadas (+1,5%/h) deixam o ar contaminado entrar. Cada filtro de ar ligado tira 3%/h. Com 100% você vira zumbi.
- Fome, sede e energia caem com o tempo; se zerarem, você perde saúde. Uma refeição ou um copo d'água repõe 60% e o desgaste é de ~50% por dia: basta comer e beber 1 vez por dia de jogo.
- Canteiros: plantar → regar todo dia → colher em 3 dias (+4 comida).
- Cisterna: +1 de água por dia (+4 se chover). Painel solar: energia depois do Dia 1.

## Novidades da v0.2

- **Andares.** *Escada do sótão* (4 madeira) abre o sótão, com a mesma planta do térreo, dois respiros para vedar e as caixas antigas do Dr. (cadernos: +10% na pesquisa). *Alçapão do bunker* (3 metal, 4 tijolos) abre um bunker de 2×2; *Escavar* (1 madeira, 2h) amplia um tile por vez. O bunker é escuro (precisa de luz), não tem sol para canteiros e, com o alçapão vedado, tem ar limpo (−1,5%/h). Térreo e sótão dividem o mesmo ar. O chip ao lado do relógio mostra o andar.
- **Zumbis forçam as aberturas.** Depois do Dia 0 eles escolhem portas e janelas do térreo (as mais fracas atraem mais; à noite, luz acesa atrai mais) e ficam cada dia mais agressivos. Resistência: janela 200, porta 300; tábuas +350 (2 madeira), chapas +1000 (2 metal); remendar +150 (1 madeira). Arrombada = buraco (+8%/h de contaminação) e os zumbis entram atrás do Dr.: −15 de saúde e +8% de contaminação por ataque. Dá para enfrentar o invasor (ganha uma amostra viral) ou fugir pela escada, porque eles não sobem.
- **Preparar o terreno** (antes do Dia 0): cortar árvores (+3 madeira), cercas (zumbis precisam derrubá-las) e estacas (abatem até 3 zumbis).
- **Laboratório e a cura (objetivo final).** Bancada (4 metal, 2 madeira, 2 tijolos), energia e reagentes da *Distribuidora Hospitalar*. Cada sessão dura 4h, gasta 1 reagente e rende 8%, ou 12% no bunker. As fases são Modelagem (até 35%, dá para fazer antes do Dia 0), Isolamento (precisa de 1 amostra) e Síntese (mais 1 amostra). As amostras vêm de abater um invasor ou de coletar o ar por uma janela (+20% de contaminação). Com 100%, você vence.

## Novidades da v0.3

- **Personagens redesenhados.** Corpo articulado, rosto com olhos que piscam, sobrancelhas, nariz e boca, e vista de costas quando andam "para cima" da tela.
  - **O Dr.:** cardigã mostarda, bigode grisalho, óculos, careca com franja branca e chinelos.
  - **Moradores:** visual por perfil: camisa e gravata, vestido e coque, idoso de bengala e chapéu, estudante de mochila, atleta de boné, avental com sacola de feira.
  - **Zumbis:** pele esverdeada, roupas rasgadas com sangue, olhos vermelhos, boca aberta. Andam mancando, curvados, com a cabeça balançando e os braços esticados ou caídos. Socam portas e caem quando morrem.
- **Animações de ação:** beber (copo à boca), lanche na geladeira, mexer a panela no fogão, comer sentado à mesa, digitar sentado, ler o jornal na poltrona ou na cadeira de balanço (que balança), martelar, cavar, cortar árvore com machado, regar, vedar com fita, pipetar no laboratório, socar o invasor e o banho (silhueta atrás do vidro, com vapor).
- **Necessidades visíveis:**
  - **Cansaço:** pálpebras pesadas e postura curvada.
  - **Sono:** bocejo com a mão na boca e "z".
  - **Fome:** mão na barriga.
  - **Sede:** enxuga a testa.
  - **Contaminação:** pele esverdeada e tosse.
  - **Saúde baixa:** palidez.
  - Um balão de pensamento mostra a necessidade mais urgente.
- **Casa nova**, de um idoso, com 8 cômodos:
  - **Cozinha:** filtro de barro e armários suspensos.
  - **Sala de jantar:** cristaleira e relógio de pêndulo.
  - **Escritório:** estantes, diplomas, quadro de fórmulas e o microscópio antigo.
  - **Banheiro** com chuveiro e **lavanderia** com a despensa.
  - **Corredor** e **sala de estar:** sofá, poltrona, cadeira de balanço e rádio de pilha.
  - **Quarto:** cama de casal com colcha de retalhos, cômoda com fotos e guarda-roupa.
  - Também tem tapetes, assoalho, azulejos, cortinas e quadros.
- **Ações novas:** comer à mesa, ler na poltrona, tomar banho (+10 energia), tomar remédio na pia do banheiro, e ouvir o **rádio de pilha**, que funciona sem energia.
- Janelas atrás de móveis podem ser vedadas e reforçadas a partir dos tiles ao lado.

## Novidades da v0.4

- **Dinheiro inicial:** R$ 5.000.
- **Luz por cômodo.** Os cômodos são detectados sozinhos: portas separam, passagens abertas juntam. O botão *Luz* abre um painel com cada cômodo, quantas janelas ele tem e um interruptor; também tem "Apagar tudo" e "Acender tudo". A tecla `L` apaga ou acende tudo. A luz vale para cada tile: a janela só deixa vazar luz se o cômodo atrás dela estiver aceso.
- **Zumbis e claridade.** De dia sobra 1 ou 2 no quintal, e os que estavam lá vão embora ao amanhecer. À noite eles vêm em bando, e a horda cresce a cada dia.
- **Atenção dos zumbis.** Depois do Dia 0, o HUD mostra *Despercebido*, *Chamando atenção* ou *Atraindo a horda!*, junto com o motivo.
  - **Luz:** janelas com o cômodo aceso atrás, que pesam mais à noite. Chapas de metal tapam a luz.
  - **Barulho:** obras, machado, reforços, luta e banho. O barulho some aos poucos; no sótão é um pouco abafado e no bunker quase não sai.
  - **Casa escura e em silêncio:** eles atravessam o quintal e vão embora sem forçar nada.
  - **Casa acesa ou barulhenta:** vêm mais deles, e eles preferem as janelas iluminadas e as aberturas perto de onde está o barulho.
  - De dia, ou quando a casa fica escura, os que estavam forçando perdem o interesse rápido.
- **Vizinhança.** As casas onde moram famílias conhecidas do Dr. ganham contorno e uma dica ao passar o mouse (por exemplo, "Casa dos Martins · 4 moradores"). Ao clicar, abre uma ficha com:
  - endereço, tipo de casa e distância da casa do Dr.;
  - como o Dr. conhece a família;
  - quantos estão em casa agora;
  - cada morador com retrato, idade, rotina, o que está fazendo agora (ou se foi infectado) e o botão **Localizar**, que leva a câmera até ele.
  
  Clicar num morador na rua também mostra o sobrenome e o atalho "Ver a casa". Os moradores agora vivem em famílias de 2 a 4 pessoas. São 60 moradores em 24 casas, as mais próximas da casa do Dr., cada família com um sobrenome diferente.
- **Comércio.** Os 28 estabelecimentos (padarias, mercados, farmácias, escritórios, escolas, academias, igreja e bares) são clicáveis. A ficha mostra:
  - nome, endereço, horário e se está aberto agora, fechado, com fila, ou saqueado e abandonado depois do Dia 0;
  - o que vende e a relação com o Dr.;
  - dono, diretora, padre ou síndico, conforme o lugar, e os funcionários com retrato e cargo;
  - quem está lá dentro agora e os frequentadores do bairro (no escritório, quem trabalha ali; na escola, quem estuda), com atalhos para localizar a pessoa ou ver a casa dela.
- **Infectados da cidade** também se escondem de dia: só alguns ficam vagando.

## Eventos aleatórios

A cada 5 a 10 horas de jogo (7 a 13 depois do Dia 0) pode acontecer um evento. Cada evento tem um intervalo mínimo antes de se repetir, e alguns acontecem uma vez só.

- **Visitas à porta (antes do Dia 0, de dia).** Um vizinho de verdade sai de casa e vem andando até a porta. Toca a campainha (com som e um sino sobre a cabeça) e espera cerca de 1h30. Toque na porta ou na pessoa para atender: o Dr. larga o que está fazendo e vai até lá, e abre um cartão com o retrato da pessoa e as escolhas.
  - **Arroz emprestado:** dar 2 comida. Em 1 ou 2 dias chega um presente na porta.
  - **Consulta:** examinar a criança dá +5% de pesquisa e R$ 150, mas custa energia.
  - **Venda de garagem:** 6 madeira e 2 metal por R$ 250.
  - **Vizinho cético:** se você explicar o perigo, ele pode acreditar e deixar 2 kits de vedação dias depois.
  - **Pedido difícil (Dia -1 ou manhã do Dia 0):** se você der comida e água, a família manda notícias pelo rádio depois do Dia 0.
- **Imprevistos antes do Dia 0:**
  - **Encomenda trocada:** ficar com os 3 kits ou devolver aos vizinhos e ganhar uma cesta depois.
  - **Promoção:** 25% de desconto numa loja até as 21h.
  - **Apagão:** 3 horas sem energia.
- **Depois do Dia 0:**
  - **Sobrevivente batendo à porta (de dia):**
    - *Abrir:* +12 de contaminação e +2 comida e +1 kit médico; em 1 a 3 horas a pessoa vira zumbi dentro de casa.
    - *Passar comida e água pela fresta:* ganha 1 reagente.
    - *Não responder:* depois você a vê no meio dos infectados.
  - **Aviso de horda no rádio:** naquela noite vêm 80% mais zumbis.
  - **Drone de suprimentos:** só dá para pegar a caixa se a casa tiver sótão.
  - **Tempestade:** arranca a vedação de uma janela; cisternas e caixas d'água captam chuva.
  - **Ratos na despensa:** −15% da comida.
  - **Pane no painel solar:** fica sem energia até o conserto, que custa 1 metal.
  - **Sons da noite:** só clima.

## Som

Todo o som é gerado no navegador (Web Audio), sem arquivos.

- **Ambiente que acompanha a tensão:** trânsito e pássaros no começo, depois sirenes e vento. A chuva começa no Dia -2, com trovões. Depois do Dia 0, só vento.
- **Ações do Dr.:** martelo nas obras, machado, pá, teclado, frascos, fita de vedação, passos, chuveiro, frigideira, gole d'água, ronco. Também tocam a TV, o chiado do rádio, a escada e o carro.
- **Zumbis:** gemidos e pancadas nas portas, com som estéreo conforme a posição na tela, e rosnado quando um deles está dentro de casa.
- **Interface:** cliques, alertas e campainha.
- **Controles:** volume e mudo no Menu, ou a tecla `M`.

### Narração e vozes (desligadas por padrão)

Para ativar, use o botão "Vozes" no Menu. As vozes vêm da síntese do navegador, com as vozes em português instaladas no aparelho; as *Natural/Online* do Edge e do Windows são as melhores.

- **Narrador:** lê a abertura, avançando no ritmo da fala, o Dia 0, o fim de jogo e os avisos de evento.
- **Doutor:** fala as dicas do tutorial e os pensamentos depois das notícias.
- **Apresentadora da TV:** lê as manchetes. Depois do Dia 0, quem lê é o locutor do rádio.
- **Vizinhos e sobreviventes:** falam com voz do gênero do personagem e um tom próprio, derivado do nome.
- **Ambiente:** abaixa enquanto alguém fala.

## Segredos

São 17 easter eggs com referências geek e brasileiras. O Menu tem a lista *Segredos*: o que você ainda não achou aparece como "???" com uma dica. Os achados ficam salvos no navegador e valem para todas as partidas.

<details><summary>Lista (spoiler)</summary>

- **Teclado:** código Konami (enche fome, sede e energia uma vez por partida), `xyzzy`, `iddqd`, `penta` (depois do Dia 0 o grito faz barulho e atrai zumbis), `sextou` e `varginha`.
- **Casa:**
  - **Relógio de pêndulo:** 13:37 e meia-noite (Cuca).
  - **Estante:** o livro muda a cada hora; procure o Guia do Mochileiro e O Alienista.
  - **Geladeira:** o pote de sorvete com feijão.
  - **Computador:** só piadas, não conta como segredo.
- **Rádio de pilha às 19h, antes do Dia 0:** toca A Voz do Brasil.
- **Eventos:** o grupo da família no zap, o visitante que precisa de 1,21 gigawatt e "Evidências" num karaokê depois do Dia 0.
- **Zumbis com personalidade:** cerca de 1 em cada 6 tem uma descrição especial, como a camisa do tetra ou o crachá da Umbrella.
- **Tela de título:** clique 7 vezes rápido no símbolo.
- **Sem segredo para achar:**
  - manchetes falsas no rodapé da TV;
  - uma frase a mais quando você acha a cura.

</details>

Atalhos no computador: `m` liga/desliga o som, `espaço` pausa, `1-3` velocidade, `b` construção, `Esc` cancela.
Depuração: `G.s` no console do navegador é o estado do jogo (ex.: `G.s.stock.madeira = 50`, `G.s.research.pts = 90`). Saves da v0.1 são migrados automaticamente.
