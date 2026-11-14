// Pronoun sets offered at character creation, and used by event templates.
// `plural: true` means verbs agree like "they are" / "they ride".
export default {
  he: { id: 'he', label: 'he/him', they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself', plural: false },
  she: { id: 'she', label: 'she/her', they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself', plural: false },
  they: { id: 'they', label: 'they/them', they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself', plural: true },
};
