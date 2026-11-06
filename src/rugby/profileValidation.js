'use strict';
function validateProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid profile');
  const club = input.club;
  const position = input.position;
  if (typeof club !== 'string' || !club.trim() || club.length > 80) throw new Error('Invalid club');
  if (typeof position !== 'string' || !position.trim() || position.length > 40) throw new Error('Invalid position');
  return {club:club.trim(),position:position.trim()};
}
module.exports = {validateProfile};
