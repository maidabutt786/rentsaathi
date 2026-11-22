import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, CalendarClock, MessageSquare, Phone, ShieldQuestion } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { demoMode } from "../../lib/firebase.js";
import { useToast } from "../../context/ToastContext.jsx";
import { getOrCreateChat, incrementView, sendMessage, updateListing } from "../../lib/listingsApi.js";
import Avatar from "../ui/Avatar.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Modal from "../ui/Modal.jsx";
import { Textarea } from "../ui/Field.jsx";

export default function LandlordCard({ listing, landlord }) {
  const { user, profile } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("Assalam-o-Alaikum, is this room still available?");
  const [sending, setSending] = useState(false);

  const name = landlord?.name || listing.ownerName || "Landlord";
  const verified = landlord?.verificationStatus ? landlord.verificationStatus === "approved" : listing.ownerVerificationStatus === "approved";

  const startChat = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (profile?.role !== "student") {
      push("Only student accounts can start a chat about a listing.", "info");
      return;
    }
    if (message.trim().length < 5) {
      push("Write a short message first.", "warning");
      return;
    }
    setSending(true);
    try {
      const chat = await getOrCreateChat({
        listingId: listing.id,
        studentId: user.uid,
        landlordId: listing.ownerId,
        studentName: profile?.name || "Student",
        landlordName: name,
      });
      await sendMessage(chat.id, user.uid, message.trim());
      if (demoMode) {
        await updateListing(listing.id, { enquiryCount: Number(listing.enquiryCount || 0) + 1 });
      }
      setOpen(false);
      navigate(`/student/chats/${chat.id}`);
    } catch (error) {
      push(error.message || "Could not start the chat.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card p-5" aria-labelledby="landlord-heading">
      <h2 id="landlord-heading" className="font-heading text-base font-semibold">
        About the landlord
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={name} size={52} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <div className="mt-1">
            {verified ? (
              <Badge tone="verified" icon={BadgeCheck}>
                Verified landlord
              </Badge>
            ) : (
              <Badge tone="suspicious" icon={ShieldQuestion}>
                Verification pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Listings</dt>
          <dd className="font-medium">{landlord?.listingCount ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Member since</dt>
          <dd className="font-medium">{landlord?.memberSince || "2026"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Phone</dt>
          <dd className="font-medium">
            {profile?.role === "student" && landlord?.phone ? (
              <a className="text-primary hover:underline" href={`tel:${landlord.phone}`}>
                {landlord.phone}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted">
                <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Shared after you start a chat
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2">
        <Button onClick={() => setOpen(true)} variant="primary" size="md">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Message landlord
        </Button>
        <Button href="#visit-form" variant="outline" size="md">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Request a visit
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Keep all messages inside RentSaathi. Do not send money before visiting the room.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${name}`}
        description="Your first message starts a chat. The landlord will see it in their dashboard."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startChat} loading={sending}>
              Send message
            </Button>
          </>
        }
      >
        <Textarea
          label="Message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          maxLength={600}
        />
      </Modal>
    </section>
  );
}
