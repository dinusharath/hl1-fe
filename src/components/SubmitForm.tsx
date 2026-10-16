import { useState } from "react";
import { ingest } from "../api";

const EXAMPLES: Record<string, unknown> = {
  "person_one (happy path)": {
    session_id: "c8267b77-d796-451e-9948-e82f56412b56",
    application_reference: "GRU-123089-2026",
    name: "John Doe",
    email: "john.doe@example.com",
    gender: "male",
    date_of_birth: "1990-01-01",
    phone_number: "07123456789",
    mobile_number: "07123456789",
    address: { address_line_1: "Stratford Village Surgery", address_line_2: "50C Romford Road", address_line_3: "London", postcode: "E15 4BZ", country: "United Kingdom" },
  },
  "person_two (edge cases)": {
    session_id: "c77fb77f-5a95-4935-9d5a-12953f29da89",
    application_reference: "GRU-123090-2026",
    name: "Andy James Smith-Jones",
    email: "andy.smith.jones@example.com",
    gender: "other",
    date_of_birth: "1985-06-20",
    phone_number: "0001",
    mobile_number: "07777777777",
    address: { address_line_1: "1 The Avenue", address_line_2: "Bristol", postcode: "BS1 1AA", country: "United Kingdom" },
  },
};

const names = Object.keys(EXAMPLES);

export function SubmitForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [example, setExample] = useState(names[0]);
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLES[names[0]], null, 2));
  const [resp, setResp] = useState("");

  const load = (name: string) => {
    setExample(name);
    setPayload(JSON.stringify(EXAMPLES[name], null, 2));
  };

  const submit = async () => {
    try {
      const r = await ingest(payload);
      setResp(`HTTP ${r.httpStatus}  ${JSON.stringify(r.body)}`);
    } catch (e) {
      setResp(`error: ${(e as Error).message}`);
    }
    onSubmitted();
  };

  return (
    <section className="card">
      <h2>Submit a form <span className="muted">POST /ingest</span></h2>
      <div className="row">
        <select value={example} onChange={(e) => load(e.target.value)}>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={() => load(example)}>Reset</button>
      </div>
      <textarea value={payload} spellCheck={false} onChange={(e) => setPayload(e.target.value)} />
      <div className="row">
        <button className="primary" onClick={submit}>Submit</button>
        <span className="muted">submit twice → dedupe · edit a field, keep session_id → NEEDS_REVIEW</span>
      </div>
      {resp && <pre className="resp">{resp}</pre>}
    </section>
  );
}
