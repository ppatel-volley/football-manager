import { useEffect, useState } from "react"
import { v4 } from "uuid"

const USER_ID_KEY = "userId"

/**
 * TODO: This will be within the Platform SDK/VGF eventually.
 */
export const useUserId = (): string | undefined => {
    const [userId, setUserId] = useState<string | undefined>(undefined)

    useEffect(() => {
        const storedUserId = localStorage.getItem(USER_ID_KEY)

        if (storedUserId) {
            setUserId(storedUserId)
        } else {
            const newUserId = v4()

            try {
                localStorage.setItem(USER_ID_KEY, newUserId)

                setUserId(newUserId)
            } catch (error) {
                console.error("Error setting user ID", error)
            }
        }
    }, [])

    return userId
}
