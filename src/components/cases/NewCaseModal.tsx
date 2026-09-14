import { useState } from "react";
import { Phone, Hash, Calendar, FileText, ChevronRight, Check, User } from "lucide-react";
import Modal from "../ui/Modal";
import { CaseService } from "../../services/api";
import { toE164 } from "../../lib/utils";
import type { Case } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Case) => void;
}

type Step = "input" | "review" | "creating";

const PARSED_PREVIEW = {
  problem: "ISP technician appointment",
  counterparty: "ISP Support",
  commitment: "Technician will arrive",
  deadline: "Friday, Sep 12 · 9 AM–1 PM",
};

export default function NewCaseModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [reference, setReference] = useState("");
  const [commitment, setCommitment] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setStep("input");
    setDescription("");
    setPhone("");
    setUserPhone("");
    setReference("");
    setCommitment("");
    setDeadline("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReview = () => {
    if (!description.trim()) {
      setError("Please describe what you need Callwaka to handle.");
      return;
    }
    if (!phone.trim()) {
      setError("Please provide a phone number for the other party.");
      return;
    }
    const cleanedPhone = toE164(phone);
    if (!cleanedPhone) {
      setError("That doesn't look like a valid phone number. Include the area code.");
      return;
    }
    if (userPhone.trim()) {
      const cleanedUserPhone = toE164(userPhone);
      if (!cleanedUserPhone) {
        setError("That doesn't look like a valid phone number for you. Include the area code.");
        return;
      }
      setUserPhone(cleanedUserPhone);
    }
    setPhone(cleanedPhone);
    setError("");
    setStep("review");
  };

  const handleCreate = async () => {
    setStep("creating");
    try {
      const c = await CaseService.createCase({
        description,
        phone,
        reference,
        commitment,
        deadline,
        userPhone,
      });
      reset();
      onCreated(c);
    } catch {
      setStep("review");
      setError("Something went wrong. Please try again.");
    }
  };

  const title =
    step === "input"
      ? "What do you need Callwaka to handle?"
      : step === "review"
      ? "Review your case"
      : "Creating case…";

  return (
    <Modal open={open} onClose={handleClose} title={title} size="md">
      {step === "input" && (
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Tell Callwaka what happened. It will take it from there.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="nc-description">
              Describe the situation
            </label>
            <textarea
              id="nc-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='"My ISP promised a technician would come Friday between 9 AM and 1 PM. Make sure they actually show up."'
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="nc-phone">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3" />
                Their phone number
              </span>
            </label>
            <input
              id="nc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (800) 555-0199"
              className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="nc-user-phone">
              <span className="flex items-center gap-1.5">
                <User className="size-3" />
                Your phone number
                <span className="text-gray-400 font-normal">(optional)</span>
              </span>
            </label>
            <input
              id="nc-user-phone"
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400">
              If you give us this, Callwaka calls <span className="font-medium text-gray-500">you</span> to verify the
              outcome (e.g. "did the technician show up?") instead of asking the other party.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="nc-ref">
                <span className="flex items-center gap-1.5">
                  <Hash className="size-3" />
                  Reference number
                  <span className="text-gray-400 font-normal">(optional)</span>
                </span>
              </label>
              <input
                id="nc-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ticket #88213"
                className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="nc-deadline">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Deadline
                  <span className="text-gray-400 font-normal">(optional)</span>
                </span>
              </label>
              <input
                id="nc-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600" htmlFor="nc-commitment">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3" />
                What was promised?
                <span className="text-gray-400 font-normal">(optional)</span>
              </span>
            </label>
            <input
              id="nc-commitment"
              type="text"
              value={commitment}
              onChange={(e) => setCommitment(e.target.value)}
              placeholder="Technician will arrive between 9 AM and 1 PM"
              className="w-full h-10 text-sm border border-gray-200 rounded-lg px-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600" role="alert">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleClose}
              className="flex-1 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleReview}
              className="flex-1 h-10 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Review case
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Confirm the details before Callwaka starts tracking.
          </p>

          <div className="space-y-4 bg-slate-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Problem</p>
              <p className="text-sm text-gray-900">{description || PARSED_PREVIEW.problem}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Who Callwaka will contact</p>
              <p className="text-sm text-gray-900">{phone}</p>
            </div>
            {userPhone && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                  Your number (for verification calls)
                </p>
                <p className="text-sm text-gray-900">{userPhone}</p>
              </div>
            )}
            {commitment && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Commitment</p>
                <p className="text-sm text-gray-900">{commitment}</p>
              </div>
            )}
            {deadline && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Deadline</p>
                <p className="text-sm text-gray-900">{new Date(deadline).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}</p>
              </div>
            )}
            {reference && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Reference</p>
                <p className="text-sm text-gray-900">#{reference}</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600" role="alert">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
              className="flex-1 h-10 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Edit
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 h-10 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Check className="size-3.5" />
              Start tracking
            </button>
          </div>
        </div>
      )}

      {step === "creating" && (
        <div className="p-6 flex flex-col items-center justify-center py-12 gap-3">
          <div className="size-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm text-gray-500">Creating your case…</p>
        </div>
      )}
    </Modal>
  );
}
