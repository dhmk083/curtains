;(async () => {
  const EXT_ID = Symbol.for('dhmk083_ext_curtains')

  const createInstance = async () => {
    let heightRatio
    let top, bot

    const cssToString = obj =>
      Object.entries(obj)
        .map(kv => kv.join(':'))
        .join(';')

    const clamp = (x, min, max) => Math.min(max, Math.max(min, x))

    const debounced = (fn, ms) => {
      let tid

      return (...args) => {
        clearTimeout(tid)
        tid = setTimeout(fn, ms, ...args)
      }
    }

    const barClass = EXT_ID.toString() + 'bar'

    const changeHeightRatio = deltaPx => {
      heightRatio = clamp(
        (window.innerHeight * heightRatio + deltaPx) / window.innerHeight,
        0.05,
        0.45
      )
      adjustBarsHeight()
      saveHeightRatio()
    }

    const adjustBarsHeight = () => {
      const baseHeight = window.innerHeight * heightRatio

      top.style.height = Math.min(window.scrollY, baseHeight) + 'px'
      bot.style.height =
        Math.min(
          Math.max(
            0,
            document.documentElement.scrollHeight -
              window.innerHeight -
              window.scrollY
          ),
          baseHeight
        ) + 'px'
    }

    const loadHeightRatio = () =>
      new Promise(res =>
        chrome.storage.local.get({ heightRatio: 0.4 }, x => res(x.heightRatio))
      )

    const saveHeightRatio = debounced(() => {
      chrome.storage.local.set({ heightRatio })
    }, 500)

    const createGrip = isTop => {
      const grip = document.createElement('div')
      grip.style.cssText = cssToString({
        cursor: 'ns-resize',
        position: 'absolute',
        width: '100%',
        height: '3px',
        left: 0,
        bottom: isTop ? 0 : 'auto',
      })

      let prevY

      grip.addEventListener('mousedown', ev => {
        ev.preventDefault()
        prevY = ev.screenY
      })

      window.addEventListener('mousemove', ev => {
        if (!prevY) return
        if (!ev.buttons) {
          prevY = null
          return
        }

        const curY = ev.screenY
        const delta = (curY - prevY) * (isTop ? 1 : -1)
        prevY = curY
        changeHeightRatio(delta)
      })

      return grip
    }

    const createBar = isTop => {
      const bar = document.createElement('div')
      bar.className = barClass
      bar.appendChild(createGrip(isTop))

      const baseCss = {
        position: 'fixed',
        left: 0,
        width: '100%',
        transition: 'transform 1s',
        'z-index': 2 ** 31 - 1,
      }

      const gradient = angle =>
        `linear-gradient(${angle}deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.9) 2%, rgba(0,0,0,0.94) 4%, rgba(0,0,0,0.96) 6%, rgba(0,0,0,1) 8%, rgba(0,0,0,1) 100%)`

      const boxShadow = isTop => `0 ${isTop ? 1 : -1}px 15px 5px`

      const css = isTop
        ? cssToString({
            ...baseCss,
            'box-shadow': boxShadow(true),
            background: gradient(0),
            top: 0,
          })
        : cssToString({
            ...baseCss,
            'box-shadow': boxShadow(false),
            background: gradient(180),
            bottom: 0,
          })

      bar.style.cssText = css
      bar.toggle = isActive => {
        bar.style.transform = isActive
          ? 'translateY(0%)'
          : `translateY(${isTop ? -100 : 100}%)`
        bar.style['box-shadow'] = isActive ? boxShadow(isTop) : 'none'
      }
      bar.toggle(false)
      document.body.appendChild(bar)
      return bar
    }

    const toggleActive = () => {
      if (top.dataset.active) {
        delete top.dataset.active
        return false
      } else {
        top.dataset.active = 1
        return true
      }
    }

    const handleClick = () => {
      const isActive = toggleActive()
      top.toggle(isActive)
      bot.toggle(isActive)
    }

    // init
    top = createBar(true)
    bot = createBar(false)
    heightRatio = await loadHeightRatio()

    for (const name of ['scroll', 'resize']) {
      window.addEventListener(name, adjustBarsHeight)
    }
    adjustBarsHeight()

    return { handleClick }
  }

  // main
  const instance = window[EXT_ID] || (window[EXT_ID] = await createInstance())
  instance.handleClick()
})()
