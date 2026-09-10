(() => {
  const svg = document.querySelector('svg.dial')
  const box = svg?.getBoundingClientRect()
  const needle = svg?.querySelector('line[stroke="var(--needle)"]')
  return {
    text: document.body.innerText,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overlay: !!document.querySelector('vite-error-overlay'),
    needle: needle && [needle.getAttribute('x2'), needle.getAttribute('y2')],
    click: box && [Math.round(box.left + box.width * 0.68), Math.round(box.top + box.height * 0.25)],
  }
})()
