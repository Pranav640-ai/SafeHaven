        <AppRow icon={LockKeyhole} title="Privacy & sharing" subtitle="Review consent and local storage" onClick={()=>go('privacy')}/>
      </div>
    </section>
    <section className="profile-section"><Heading title="More"/>
      <div className="list-panel profile-settings-list">
        <AppRow icon={CircleHelp} title="Help & information" onClick={()=>openDialog('help')}/>
      </div>
    </section>
    <button
      type="button"
      className="signout"
      onClick={async () => {
        try {
          if (firebaseUser) await signOut(auth);
          setIsGuest(false);
          setIsAuthenticated(false);
          setPage('home');
          navigationDepth.current = 0;
          window.history.replaceState(
            { safehaven: true, page: 'home', scroll: 0, depth: 0, dialog: null },
            ''
          );
          setName('Traveler');
          setToast('');
        } catch (error) {
          console.error('Sign-out failed:', error);
          setToast('Unable to sign out. Please try again.');
        }
      }}
    >
      Sign out
    </button>
  </>;}

  function languagePage(){return <>
    <BackHeader title="Language settings" back={back}/>
    <section className="content-section">
      <h2>Preferred language</h2>
      <p>Used for safety guidance and report explanations. The rest of the interface currently remains in English.</p>
      <label className="tool-field">Language
        <select aria-label="Preferred language" value={read('language',language)} onChange={event=>{setLanguage(event.target.value);setToast('Language preference saved');}}>
          {Object.entries(languageNames).map(([code,title])=><option key={code} value={code}>{title}</option>)}
        </select>
      </label>
    </section>
  </>;}

  if (authLoading) {
    return (
      <div className="preview-stage" aria-busy="true" aria-live="polite">
        <div className="phone-shell"><div className="phone-scroll"><div className="screen-content">
          <p>Loading Meridian...</p>
        </div></div></div>
      </div>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return (
      <GoogleLoginPage
        onLoginSuccess={(user) => {
          if (user?.displayName) setName(user.displayName);
          setIsAuthenticated(true);
          setToast("Welcome to SafeHaven");
        }}
        onGuestContinue={() => {
          setIsGuest(true);
          setToast("Welcome to SafeHaven");
        }}
      />
    );
  }

  return (
    <div className="preview-stage">
      <main className="phone-shell">
        <div className="phone-scroll" onScroll={handleScroll} ref={scrollRef}>
          <div className="screen-content">
      {page === 'home' && home()}
      {page === 'explore' && explore()}
      {page === 'risk' && risk()}
      {page === 'replan' && replan()}
      {page === 'guide' && guidePage()}
      {page === 'mesh' && mesh()}
      {page === 'beacon' && beacon()}
      {page === 'pack' && pack()}
      {page === 'profile' && profile()}
      {page === 'language' && languagePage()}
      {page === 'privacy' && <>
        <BackHeader title="Privacy & sharing" back={back}/>
        <div className="content-section">
          <h2>Your choices</h2>
          <p>Contacts, plans, saved guidance and language preferences are stored on this device.</p>
          <p>Private group check-ins and nearby sharing are separate. Review consent for each audience independently.</p>
          <button className="secondary-button" onClick={()=>go('pack')}>Manage group sharing</button>
          <button className="secondary-button" onClick={()=>go('mesh')}>Manage nearby connections</button>
        </div>
      </>}
      {page === 'sos' && sos()}
          </div>
        </div>
      <nav className={`floating-dock ${compact?'dock-compact':''}`} aria-label="Main navigation">
        {([{id:'home',label:'Home',icon:Home},{id:'explore',label:'Explore',icon:Compass}] as const).map(item=>{
          const Icon=item.icon;
          return <button key={item.id} type="button" aria-label={item.label} aria-current={tab===item.id?'page':undefined} onClick={()=>go(item.id)} className={`dock-item ${tab===item.id?'dock-active':''}`}>
            <span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{item.label}</span>
          </button>;
        })}
        <motion.button type="button" className="dock-sos" aria-label="Emergency SOS" aria-current={page==='sos'?'page':undefined} onClick={()=>go('sos')} whileTap={{scale:.92}}>
          <ShieldAlert size={21}/><small>SOS</small>
        </motion.button>
        {([{id:'mesh',label:'Mesh',icon:Radio},{id:'profile',label:'Profile',icon:UserRound}] as const).map(item=>{
          const Icon=item.icon;
          return <button key={item.id} type="button" aria-label={item.label} aria-current={tab===item.id?'page':undefined} onClick={()=>go(item.id)} className={`dock-item ${tab===item.id?'dock-active':''}`}>
            <span className="dock-active-bg" aria-hidden="true"/><Icon size={22} strokeWidth={2.1}/><span>{item.label}</span>
          </button>;
        })}
      </nav>
      <Modal kind={dialog} close={closeDialog} person={name} saveName={setName} navigate={go} checkDestination={()=>openDestination(read<Place|null>('destination',null)?.name||'Manali')}/>
      {loading && <SkeletonScreen profile={page==='profile'} />}
      {toast && <NotificationToast message={toast} />}
      </main>
    </div>
  );
}
