/* Click to run.

   Every demo on this site sits behind a poster image until someone asks for
   it. Three canvas simulations that all boot on page load would fight over the
   first frame, spin up three WebGL contexts, and cost a phone battery for
   something the visitor may never look at. It also means a page carrying an
   embed makes no third-party request, and starts no animation, until clicked.

   {once:true} because after the iframe exists there is nothing left to do. */
document.querySelectorAll('.playable').forEach(box => {
  const start = box.querySelector('.start');
  if (!start || !box.dataset.src) return;
  start.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = box.dataset.src;
    const img = box.querySelector('img');
    f.title = (img && img.alt) || 'Interactive demo';
    f.setAttribute('allow', 'fullscreen');
    box.appendChild(f);
    box.classList.add('live');
  }, {once: true});
});
