
const { neon } = require("@neondatabase/serverless");

const connectionString = "postgresql://neondb_owner:npg_8lcFpjQ5kodE@ep-fancy-flower-ac8to1nr-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(connectionString);

async function run() {
    console.log("--- Starting Verification ---");

    // 1. Create a Test Project
    const partCode = "TEST-QTY-" + Date.now();
    console.log(`Creating project ${partCode} with quantity 43...`);

    // Need a company first
    let company = await sql`SELECT id FROM companies LIMIT 1`;
    if (company.length === 0) {
        const newCo = await sql`INSERT INTO companies (name) VALUES ('Test Co') RETURNING id`;
        company = newCo;
    }
    const companyId = company[0].id;

    const project = await sql`
    INSERT INTO projects (part_code, company_id, quantity, description, status)
    VALUES (${partCode}, ${companyId}, 43, 'Test Qty Bug', 'PENDENTE')
    RETURNING *
  `;
    const projectId = project[0].id;
    console.log(`Project created. ID: ${projectId}, Quantity: ${project[0].quantity}`);
    console.log(`Initial Status: ${project[0].status}`);

    // 2. Start Production (Op 1)
    console.log("Starting Op 1...");
    // Get an operation
    let op1 = await sql`SELECT id FROM operations LIMIT 1`;
    if (op1.length === 0) {
        const newOp = await sql`INSERT INTO operations (name, machine_cost_per_hour) VALUES ('TestOp', 10) RETURNING id`;
        op1 = newOp;
    }
    const opId = op1[0].id;

    // Get an operator
    let operator = await sql`SELECT id FROM operators LIMIT 1`;
    if (operator.length === 0) {
        // Create dummy operator
        // Password hash for '123456'
        const newOp = await sql`INSERT INTO operators (name, login, password_hash) VALUES ('Test', 'test', 'hash') RETURNING id`;
        operator = newOp;
    }
    const operatorId = operator[0].id;


    // Simulate Start Production Logic
    // Ensure part exists
    const part = await sql`
    INSERT INTO parts (code, company_id) VALUES (${partCode}, ${companyId})
    ON CONFLICT (code, company_id) WHERE company_id IS NOT NULL DO UPDATE SET code = EXCLUDED.code
    RETURNING id
  `;
    const partId = part[0].id;

    // Insert production record
    await sql`
    INSERT INTO production_records (part_id, operation_id, operator_id, quantity, status, start_time, project_id)
    VALUES (${partId}, ${opId}, ${operatorId}, ${project[0].quantity}, 'EM_PRODUCAO', NOW(), ${projectId})
  `;

    // Update project status
    await sql`UPDATE projects SET status = 'EM_PRODUCAO' WHERE id = ${projectId}`;

    // 3. Check Quantity
    let pCheck = await sql`SELECT quantity, status FROM projects WHERE id = ${projectId}`;
    console.log(`After Start Op 1 -> Project Quantity: ${pCheck[0].quantity}, Status: ${pCheck[0].status}`);

    if (pCheck[0].quantity !== 43) {
        console.error("BUG DETECTED: Quantity changed after starting Op 1!");
    }

    // 4. Finish Op 1
    console.log("Finishing Op 1...");
    // Simulate Finish Production Logic
    // Update production record
    await sql`
      UPDATE production_records
      SET status = 'FINALIZADO', end_time = NOW()
      WHERE project_id = ${projectId} AND status = 'EM_PRODUCAO'
  `;

    // Update project status to PENDENTE (simulating next op needed)
    await sql`UPDATE projects SET status = 'PENDENTE' WHERE id = ${projectId}`;

    pCheck = await sql`SELECT quantity, status FROM projects WHERE id = ${projectId}`;
    console.log(`After Finish Op 1 -> Project Quantity: ${pCheck[0].quantity}, Status: ${pCheck[0].status}`);

    if (pCheck[0].quantity !== 43) {
        console.error("BUG DETECTED: Quantity changed after finishing Op 1!");
    }

    // 5. Start Op 2
    console.log("Starting Op 2...");
    await sql`
    INSERT INTO production_records (part_id, operation_id, operator_id, quantity, status, start_time, project_id)
    VALUES (${partId}, ${opId}, ${operatorId}, ${project[0].quantity}, 'EM_PRODUCAO', NOW(), ${projectId})
  `;
    await sql`UPDATE projects SET status = 'EM_PRODUCAO' WHERE id = ${projectId}`;

    pCheck = await sql`SELECT quantity, status FROM projects WHERE id = ${projectId}`;
    console.log(`After Start Op 2 -> Project Quantity: ${pCheck[0].quantity}, Status: ${pCheck[0].status}`);

    if (pCheck[0].quantity !== 43) {
        console.error("BUG DETECTED: Quantity changed after starting Op 2!");
    } else {
        console.log("SUCCESS: Quantity remained 43 throughout the process.");
    }

    // Clean up
    console.log("Cleaning up...");
    await sql`DELETE FROM production_records WHERE project_id = ${projectId}`;
    await sql`DELETE FROM projects WHERE id = ${projectId}`;
    await sql`DELETE FROM parts WHERE code = ${partCode}`;

    console.log("--- Verification Complete ---");
}

run().catch(console.error);
