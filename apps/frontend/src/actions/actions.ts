"use server";

import { revalidatePath } from "next/cache";

/*
    Server functions
*/

export async function createUser(formData: unknown) {
    if (typeof (formData) != "object") {

    }
    revalidatePath("/")
}