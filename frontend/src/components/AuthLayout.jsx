const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-slate-50 to-slate-100
      dark:from-[#050505] dark:to-[#0A0A0A]">

      <div className="w-full max-w-md p-8 rounded-2xl
        bg-white dark:bg-[#0A0A0A]
        border border-slate-200 dark:border-white/10
        shadow-xl text-center">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
