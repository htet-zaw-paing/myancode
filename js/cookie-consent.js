(function() {
    const c = 'myancode_cookie_consent';

    function i() {
        if (localStorage.getItem(c)) return;

        const m = document.documentElement.lang === 'mm';
        const d = {
            t: m ? 'ကိုယ်ရေးအချက်အလက်နှင့် ကွတ်ကီး မူဝါဒ' : 'Privacy & Cookie Preferences',
            p: m ? 'သင်၏ အသုံးပြုမှု အတွေ့အကြုံကို အကောင်းဆုံးဖြစ်စေရန်နှင့် လုပ်ဆောင်ချက်များကို ပိုမိုချောမွေ့စေရန် ကျွန်ုပ်တို့ ကွတ်ကီးများကို အသုံးပြုပါသည်။ ဆက်လက်အသုံးပြုခြင်းဖြင့် ကျွန်ုပ်တို့၏ မူဝါဒများကို လက်ခံရာရောက်ပါသည်။' : 'We employ cookies to optimize site functionality, analyze performance, and deliver a tailored digital experience. By continuing to use our platform, you consent to our data practices.',
            e: m ? 'မရှိမဖြစ်များသာ' : 'Essential Only',
            a: m ? 'လက်ခံ၍ ဆက်လက်မည်' : 'Accept & Continue'
        };

        const b = document.createElement('div');
        b.id = 'mc-cookie';
        b.className = 'fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[9999] max-w-[400px] w-[calc(100%-3rem)] bg-[#050505]/95 backdrop-blur-3xl border border-white/5 rounded-xl p-7 shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] transform transition-all duration-700 translate-y-32 opacity-0 pointer-events-none flex flex-col gap-5 font-sans';

        b.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <h3 class="text-white font-display font-semibold text-[16px] tracking-wide">${d.t}</h3>
            </div>
            <p class="text-[13px] text-neutral-400 font-medium leading-relaxed">${d.p}</p>
            <div class="flex flex-col sm:flex-row gap-3 mt-1">
                <button id="mc-ess" class="flex-1 px-4 py-3 rounded-lg border border-neutral-800 text-neutral-400 text-[12px] font-semibold tracking-wide hover:bg-white/5 hover:text-white transition-all duration-300">
                    ${d.e}
                </button>
                <button id="mc-acc" class="flex-1 px-4 py-3 rounded-lg bg-white text-black text-[12px] font-semibold tracking-wide hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-0.5">
                    ${d.a}
                </button>
            </div>
        `;

        document.body.appendChild(b);

        setTimeout(() => {
            b.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
            b.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
        }, 1500);

        function h(t) {
            localStorage.setItem(c, t);
            
            b.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
            b.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
            
            setTimeout(() => b.remove(), 700);

            if (typeof window.showToast === 'function') {
                const msg = t === 'all' 
                    ? (m ? 'ကွတ်ကီးအားလုံးကို လက်ခံပြီးပါပြီ' : 'All cookies accepted') 
                    : (m ? 'မရှိမဖြစ် ကွတ်ကီးများကိုသာ လက်ခံထားပါသည်' : 'Essential cookies only accepted');
                window.showToast(msg);
            }
        }

        document.getElementById('mc-ess').addEventListener('click', () => h('essential'));
        document.getElementById('mc-acc').addEventListener('click', () => h('all'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', i);
    } else {
        i();
    }
})();