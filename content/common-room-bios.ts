/**
 * Matched to the public founder profiles at https://www.yalehackerhouse.com/#founders
 * on 2026-09-22. Freeman Irabaruta there is Freeman Iraburata in this roster.
 * Common Room owner edits take precedence: Oliver and Freeman have no company
 * references; Bruno is described through prediction markets, not a founder title.
 * Older YES co-president claims are omitted in favor of the current roster.
 * Unmatched people retain their owner-approved role until a fuller bio is supplied.
 */
export const HACKER_HOUSE_URL = 'https://www.yalehackerhouse.com'

export const HACKER_HOUSE_BIO_SLUGS: readonly string[] = [
  'nicolas-gertler', 'lucas-santos', 'oliver-hime', 'freeman-irabaruta',
  'leia-ryan', 'james-masson', 'bruno-bruno', 'murad-abdukholikov', 'ariyan-patel',
]

export const COMMON_ROOM_BIOS: Readonly<Record<string, string>> = {
  // Supplied directly by the YES team; these are not Hacker House profiles.
  'zain-anwar':
    "Zain Anwar is a Yale sophomore studying molecular biology and economics, where he chairs the YCC Tech Division and spent this past summer as a Summer Analyst at Maverick Capital's AI compute fund. Outside of class he co-founded Cadence, an AI speech-monitoring platform for Alzheimer's that won the Yale Healthcare Hackathon, and IntersectSTEM, a nonprofit that has brought STEM programming to more than 250 refugee and international students. Board Member of YES.",
  'ari-strober':
    'Studying Cognitive Science at Yale. Building in the Policy Tech space. Board Member of YES.',
  'sofia-teifeld':
    'Sofia Teifeld is a Yale College ’29 Founding Team and COO of CHET — an investing-first Mastercard designed for students and young professionals. The card automatically invests 0.7% of every purchase into a user-selected ETF, with merchant-funded rewards of up to 10%. By combining everyday spending, credit building, and automatic investing, C:HET makes it easier for young consumers to start building wealth without needing prior investing experience.',
  'sina-dehghani':
    'From North Carolina, Sina has built and exited a startup, undergone YC W26 at another, and spent this past summer integrating AI into investment firms.',
  'nicolas-gertler':
    "Nicolas Gertler is a senior at Yale studying Cognitive Science. He is the Co-Founder of Density Partners, an AI legal services startup. Previously, he founded Mylon, an AI startup that partners with higher education institutes to build tools for teaching, research, and operations, backed by Pear VC. He developed the Luciano Floridi Bot — the first freely available AI assistant built around a single scholar's work — which searches and synthesizes three decades of Floridi's books, has reached 107 countries, and was documented in Minds & Machines. At Yale, he is the Student AI Ambassador. He also built MANTRA, a U.S. State Department-backed platform used by Ukraine's war-crimes investigators to structure testimony and build cases.",
  'lucas-santos':
    "Lucas Santos is a senior at Yale studying Cognitive Science. He is the Co-Founder of Density Partners, an AI legal services startup. Lucas previously led operations at Mylon, a startup developing AI agents for education, backed by Pear VC. At Yale, he co-authored the school's AI guidelines and conducted research on behavioral addiction at the Yale School of Medicine.",
  'oliver-hime':
    'Oliver Hime is a junior at Yale studying Statistics & Data Science, a Z Fellow, and a robotics researcher. He previously built a recycled-plastic clothing company backed by Cambridge University and created an online tutoring platform that grew to 10,000 users. His experience also includes software engineering and venture capital.',
  'freeman-irabaruta':
    'Freeman Iraburata studied Computer Science at Yale and is a Z Fellow and robotics researcher. His experience spans systems engineering, data labeling operations in Rwanda, and a Department of Defense project using drones and edge machine learning for threat neutralization.',
  'leia-ryan':
    'Leïa Ryan is a junior at Yale studying Molecular Biophysics & Biochemistry. She is the Co-Founder of Cortex, a neurosymbolic AI platform that is building the ontology and reasoning infrastructure for modern biology, which recently raised $600,000 in pre-seed funding led by Long Journey Ventures. She previously worked at Kallyope on migraine asset development and conducts research at the Yale School of Medicine, where she developed multi-omic cell maps for drug-response prediction. She also built E(3)-equivariant graph neural networks for 3D chromatin reconstruction from Hi-C data.',
  'james-masson':
    'James Masson is a junior at Yale, studying Mathematics and Computer Science. He is the Founder of NADE (Neural Anomaly Detection Engine), a physical-layer intrusion detection system for optical inter-satellite links that is being developed in partnership with the U.S. Military and the Space Development Agency through SBIR. He also works with OpenAI on the development of Codex, their agentic coding platform. Previously, he was a design partner for Epicenter (YC S25) and researched algorithmic game theory with the NYU Department of Economics.',
  'bruno-bruno':
    'Bruno Bruno is a senior at Yale studying Computer Science, Mathematics, and Economics. Born and raised in Tanzania, he works on prediction markets. His experience includes enterprise software and employment services for African businesses, as well as an internship at a stockbroker on the Dar es Salaam Stock Exchange.',
  'murad-abdukholikov':
    "Murad Abdukholikov is a senior at Yale studying Computer Science and is the founder of Tillr Robotics, which builds autonomous drones for American orchards. Tillr's drones use AI to detect crop disease and identify pests. Murad grew up farming in Uzbekistan, and Tillr trains its systems in Central Asia. Before Tillr, he built an AI research agent at Yale's Interactive Machines Group, prototyped a wearable headset at a startup, and at 15, sold a point-of-sale system to a local business.",
  'ariyan-patel':
    'Ariyan Patel is a sophomore at Yale studying Electrical Engineering and Economics. He previously co-founded Pathlight, an AI accessibility company building voice-first tools for blind and low-vision users. Through Pathlight and his broader work in accessibility, Ariyan reached more than 60,000 blind and low-vision people across the U.S. He has also worked in the U.S. Department of Health and Human Services and the Pennsylvania House of Representatives on public health initiatives. He is now building in the healthcare space while serving as Co-President of the Yale Entrepreneurial Society.',
}
