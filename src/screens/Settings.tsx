import { useState } from "react";
import { ToggleLeft, ToggleRight, User, Phone, Bell, Zap } from "lucide-react";

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={label}
      className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
    >
      {value ? (
        <ToggleRight className="size-7 text-blue-600" />
      ) : (
        <ToggleLeft className="size-7 text-gray-300" />
      )}
    </button>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {control}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`setting-${title}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-400">{icon}</span>
        <h2 id={`setting-${title}`} className="text-sm font-semibold text-gray-900">
          {title}
        </h2>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl px-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [notifyBroken, setNotifyBroken] = useState(true);
  const [notifyCommitment, setNotifyCommitment] = useState(true);
  const [notifyResolved, setNotifyResolved] = useState(true);

  const [autoEscalate, setAutoEscalate] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [supervisorConfirm, setSupervisorConfirm] = useState(true);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and automation preferences.</p>
      </div>

      <Section icon={<User className="size-4" />} title="Profile">
        <SettingRow
          label="Name"
          control={
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-9 w-full sm:w-44 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          }
        />
        <SettingRow
          label="Email"
          control={
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 w-full sm:w-44 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          }
        />
      </Section>

      <Section icon={<Phone className="size-4" />} title="Phone">
        <SettingRow
          label="Your phone number"
          description="Kept may use this for verification callbacks."
          control={
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="h-9 w-full sm:w-44 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          }
        />
      </Section>

      <Section icon={<Bell className="size-4" />} title="Notifications">
        <SettingRow
          label="Promise broken"
          description="Alert when a commitment is not fulfilled."
          control={
            <Toggle value={notifyBroken} onChange={setNotifyBroken} label="Promise broken notifications" />
          }
        />
        <SettingRow
          label="New commitment"
          description="Alert when Kept secures a new promise."
          control={
            <Toggle value={notifyCommitment} onChange={setNotifyCommitment} label="New commitment notifications" />
          }
        />
        <SettingRow
          label="Case resolved"
          description="Alert when a case is fully closed."
          control={
            <Toggle value={notifyResolved} onChange={setNotifyResolved} label="Case resolved notifications" />
          }
        />
      </Section>

      <Section icon={<Zap className="size-4" />} title="Automation">
        <SettingRow
          label="Automatic escalation"
          description="Kept will call again if a promise is broken."
          control={
            <Toggle value={autoEscalate} onChange={setAutoEscalate} label="Automatic escalation" />
          }
        />
        <SettingRow
          label="Maximum escalation attempts"
          control={
            <select
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              className="h-9 w-20 text-sm border border-gray-200 rounded-lg px-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              aria-label="Maximum escalation attempts"
            >
              {["1", "2", "3", "4", "5"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          }
        />
        <SettingRow
          label="Ask before supervisor escalation"
          description="Require your confirmation before escalating to a supervisor."
          control={
            <Toggle value={supervisorConfirm} onChange={setSupervisorConfirm} label="Confirm before supervisor escalation" />
          }
        />
      </Section>

      <div className="pt-2">
        <button
          onClick={() => {}}
          className="h-10 px-4 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
