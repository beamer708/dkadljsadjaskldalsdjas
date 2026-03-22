const d = require('discord.js');
console.log('discord.js version:', d.version);
['SectionBuilder', 'SeparatorSpacingSize', 'ContainerBuilder', 'TextDisplayBuilder', 'SeparatorBuilder'].forEach(function(n) {
  console.log(n + ': ' + (typeof d[n] !== 'undefined' ? 'OK' : 'MISSING'));
});
