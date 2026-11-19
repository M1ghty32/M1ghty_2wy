(() => {
  const current = new URL(location.href);
  const worldOptions = ['skipintro', 'zone', 'quality', 'nomarkers', 'reduced'];
  if (!/^#\/(?:space|world)(?:\/|$)/.test(current.hash) &&
      !worldOptions.some((option) => current.searchParams.has(option))) return;

  const world = new URL('./world.html', current);
  world.search = current.search;
  world.hash = current.hash;
  location.replace(world);
})();
