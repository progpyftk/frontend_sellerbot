let plotlyLoaded = false
let plotlyLoadPromise

export function loadPlotly() {
  if (plotlyLoaded || window.Plotly) {
    plotlyLoaded = true
    return Promise.resolve()
  }
  if (plotlyLoadPromise) return plotlyLoadPromise
  plotlyLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    let timeout
    const fail = (error) => {
      clearTimeout(timeout)
      plotlyLoadPromise = null
      script.remove()
      reject(error)
    }
    timeout = setTimeout(() => fail(new Error('Plotly timeout')), 8000)
    script.src = 'https://cdn.plot.ly/plotly-basic-3.0.0.min.js'
    script.onload = () => { clearTimeout(timeout); plotlyLoaded = true; resolve() }
    script.onerror = () => fail(new Error('Plotly load failed'))
    document.head.appendChild(script)
  })
  plotlyLoadPromise.catch(() => {})
  return plotlyLoadPromise
}
