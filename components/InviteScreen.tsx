import { Button, Flex, Text } from "@chakra-ui/react"
import BaseLayout from "./BaseLayout"
import { botInviteUrl } from "../lib/publicConfig"

/** Shown when the user manages a guild that the bot has not been invited to. */
export default function InviteScreen() {
    return (
        <BaseLayout pageTitle={"Bot not in Guild"}>
            <Flex alignItems="center" justifyContent="center" direction="column" px={6} gap={6} minH="40vh">
                <Text fontSize={{ base: "xl", md: "2xl" }} textAlign="center" maxW="40ch">
                    To access this guild&apos;s Dashboard, you must invite MyProtect to the server!
                </Text>
                <Button
                    colorScheme="brand.blue"
                    size="lg"
                    onClick={() => window.open(botInviteUrl(), "_blank", "noopener")}
                >
                    Invite Bot
                </Button>
            </Flex>
        </BaseLayout>
    )
}
