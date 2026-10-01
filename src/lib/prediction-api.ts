import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool } from "./db";

const patientInputSchema = z.object({
  age: z.number(),
  sex: z.number(),
  cp: z.number(),
  trestbps: z.number(),
  chol: z.number(),
  fbs: z.number(),
  restecg: z.number(),
  thalach: z.number(),
  exang: z.number(),
  oldpeak: z.number(),
  slope: z.number(),
  ca: z.number(),
  thal: z.number(),
});

const predictionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  probability: z.number(),
  band: z.string(),
  input: patientInputSchema,
  topFactor: z.string(),
});

export const savePrediction = createServerFn({ method: "POST" })
  .inputValidator(predictionSchema)
  .handler(async ({ data }) => {
    await pool.query(
      `
      INSERT INTO prediction_history (
        id,
        created_at,
        probability,
        band,
        top_factor,
        age,
        sex,
        cp,
        trestbps,
        chol,
        fbs,
        restecg,
        thalach,
        exang,
        oldpeak,
        slope,
        ca,
        thal
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18
      )
      `,
      [
        data.id,
        data.createdAt,
        data.probability,
        data.band,
        data.topFactor,
        data.input.age,
        data.input.sex,
        data.input.cp,
        data.input.trestbps,
        data.input.chol,
        data.input.fbs,
        data.input.restecg,
        data.input.thalach,
        data.input.exang,
        data.input.oldpeak,
        data.input.slope,
        data.input.ca,
        data.input.thal,
      ],
    );

    return data;
  });