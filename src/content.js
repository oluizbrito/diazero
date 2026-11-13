// Textos: notícias da TV e pensamentos do protagonista.
import { iconHTML } from './icons.js';
export const PROTAGONIST = 'Doutor Átila Varela';

export const NEWS = {
  [-7]: {
    headline: 'Novo vírus respiratório é identificado no exterior',
    body: 'Autoridades de saúde afirmam que não há motivo para alarme. "É mais uma gripe", diz porta-voz.',
    thought: 'Incubação curtíssima, transmissão por aerossol e... relatos de agressividade? Eu já vi esse padrão nos meus modelos, 30 anos atrás. Pelas minhas contas, chega aqui em 7 dias. Ninguém vai me ouvir. Preciso me preparar.',
  },
  [-6]: {
    headline: 'Casos confirmados em 12 países',
    body: 'Organização Mundial da Saúde diz que acompanha a situação "com atenção".',
    thought: 'A partícula é pequena demais. Máscara nenhuma segura isso. A única defesa é o ar da casa: cada janela, cada porta, cada fresta precisa ser vedada.',
  },
  [-5]: {
    headline: 'Primeiros casos no Brasil',
    body: 'Ministério recomenda lavar as mãos e evitar aglomerações.',
    thought: 'Lavar as mãos... Comida e água para semanas. E um jeito de produzir mais: canteiros DENTRO de casa. Depois do Dia 0 o quintal não existe mais.',
  },
  [-4]: {
    headline: 'Hospitais relatam pacientes violentos',
    body: 'Especialistas pedem calma e dizem que os casos são "isolados".',
    thought: 'Fase neurológica. É exatamente o que eu temia. Os infectados não são mais pessoas, e vão forçar portas. Tábuas, chapas de metal... e um lugar alto ou fundo para onde fugir: eles não sobem escadas.',
  },
  [-3]: {
    headline: 'Corrida aos supermercados: preços disparam',
    body: 'Prateleiras vazias em várias cidades. Procon investiga abusos.',
    thought: 'Cada dia que passa fica mais caro. E eu preciso de reagentes: se ninguém vai procurar a cura, eu mesmo procuro. Um laboratório aqui em casa... no bunker, longe de tudo, seria o ideal.',
  },
  [-2]: {
    headline: 'Governo decreta estado de emergência',
    body: 'Escolas e escritórios fechados. Técnicos de energia e saneamento são afastados.',
    thought: 'Sem gente para operar, a rede elétrica cai em poucos dias. Depois, a água. Painel solar e cisterna, agora.',
  },
  [-1]: {
    headline: '"Fiquem em casa", pede o presidente',
    body: 'Relatos de ataques em várias capitais. Sirenes por toda a cidade.',
    thought: 'Amanhã, por volta do meio-dia, o vírus estará no ar daqui. Hoje é o último dia para comprar qualquer coisa.',
  },
  [0]: {
    headline: 'URGENTE: O VÍRUS ESTÁ NO AR',
    body: 'Contaminação aérea confirmada na região a partir do meio-dia. NÃO SAIA DE CASA. Quem sair será infectado em minutos.',
    thought: 'É hoje. Ao meio-dia, tudo lá fora vira veneno. Preciso estar dentro de casa — e a casa precisa estar fechada.',
  },
};

export const POST_NEWS = [
  { headline: 'Sinal intermitente', body: '...repetimos: permaneçam em suas casas. Equipes de resgate não têm previsão de...', thought: 'Ninguém virá. Estamos por conta própria.' },
  { headline: 'Transmissão de emergência', body: 'Pesquisadores buscam uma cura. Laboratórios estão isolados.', thought: 'Eu fui o melhor nisso. Talvez... com o equipamento certo, eu mesmo consiga.' },
  { headline: 'Chiado', body: '(Só estática. Ao fundo, gemidos.)', thought: 'Silêncio lá fora. Só eles.' },
];

export const HELP_HTML = `
<ul class="help">
  <li>${iconHTML('walk')}<div><b>Andar</b>toque/clique no chão.</div></li>
  <li>${iconHTML('eye')}<div><b>Câmera</b>arraste para mover; pinça ou rodinha dá zoom.</div></li>
  <li>${iconHTML('info')}<div><b>Interagir</b>toque em objetos: geladeira, cama, TV, janela…</div></li>
  <li>${iconHTML('car')}<div><b>Compras</b>vá de carro ao mercado e às lojas, só antes do Dia 0.</div></li>
  <li>${iconHTML('build')}<div><b>Construir</b>paredes, pisos, canteiros, cisterna, painel solar, filtro de ar.</div></li>
  <li>${iconHTML('seal')}<div><b>Vedação</b>toque em janelas e portas para vedá-las com kits.</div></li>
  <li>${iconHTML('biohazard')}<div><b>Dia 0 (meio-dia)</b>o vírus chega pelo ar. Buracos e janelas sem vedação deixam ele entrar.</div></li>
  <li>${iconHTML('bunker')}<div><b>Andares</b><i>escada do sótão</i> ou <i>alçapão do bunker</i>. Bunker: escave para ampliar; ar limpo se vedado, mas escuro.</div></li>
  <li>${iconHTML('bulb')}<div><b>Luz e barulho</b>infectados fogem da claridade e vêm em bando à noite. Luz nas janelas e barulho os atraem; use o botão <i>Luz</i>.</div></li>
  <li>${iconHTML('shield')}<div><b>Zumbis</b>forçam as aberturas mais fracas. Reforce com tábuas ou chapas. Se entrarem, lute ou fuja pela escada.</div></li>
  <li>${iconHTML('axe')}<div><b>Terreno</b>corte árvores, levante cercas e arme estacas antes do Dia 0.</div></li>
  <li>${iconHTML('flask')}<div><b>A cura</b>monte o laboratório, compre reagentes na Distribuidora Hospitalar e pesquise. O final exige amostras vivas.</div></li>
</ul>`;

// Rodapé (ticker) da TV, por fase
export const TICKER = {
  normal: [
    'Bolsa fecha em alta apesar das incertezas',
    'Especialistas descartam pandemia',
    'Previsão do tempo: sol com pancadas de chuva à tarde',
    'Aeroportos operam normalmente',
    'Ministério recomenda lavar as mãos com frequência',
  ],
  urgent: [
    'NÃO SAIA DE CASA',
    'Feche portas e janelas',
    'Contaminação aérea confirmada a partir do meio-dia',
    'Hospitais sem capacidade de atendimento',
    'Evite contato com pessoas com comportamento agressivo',
  ],
  weak: [
    'PERMANEÇA EM CASA',
    'Racione água e comida',
    'Mantenha portas e janelas vedadas',
    'Aguarde novas instruções',
  ],
};
