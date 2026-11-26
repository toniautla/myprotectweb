import { Box, Flex, Heading, Icon, Text, useDisclosure } from "@chakra-ui/react"
import BaseLayout from "../../../components/BaseLayout"
import InviteScreen from "../../../components/InviteScreen"
import { loadGuildContext } from "../../../lib/guildProps"
import { FetchGuildDoc } from "../../../lib/DbUtils"
import { FaCog } from "react-icons/fa"
import RuleModal from "../../../components/ManageModals/Rules"
import ChannelModal from "../../../components/ManageModals/Channels"
import VerificationModal from "../../../components/ManageModals/Verification"
import LoggingModal from "../../../components/ManageModals/Logging"

function ManageBox({ name, description, doc, Modal, guild }) {
    const { isOpen, onOpen, onClose } = useDisclosure()

    return (
        <Flex
            alignItems="center"
            justifyContent="space-between"
            w={{ base: "100%", md: "640px" }}
            p={6}
            bg="gray.800"
            rounded="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            _hover={{ borderColor: "whiteAlpha.300" }}
            className="animate"
        >
            <Box>
                <Text fontSize="xl" fontWeight="bold">
                    {name}
                </Text>
                <Text fontSize="sm" color="gray.400">
                    {description}
                </Text>
            </Box>

            <Icon
                cursor="pointer"
                as={FaCog}
                fontSize="2rem"
                _hover={{ transform: "rotate(45deg)", color: "brand.blue.300" }}
                className="animate"
                onClick={onOpen}
            />

            {Modal && <Modal guild={guild} onClose={onClose} isOpen={isOpen} doc={doc} />}
        </Flex>
    )
}

export default function ManagePage({ guild, docs }) {
    if (!guild) return <InviteScreen />

    return (
        <BaseLayout pageTitle={guild.name} navGuild={guild}>
            <Flex direction="column" alignItems="center" px={6} mb={6}>
                <Heading fontSize={{ base: "2xl", md: "3xl" }}>Manage Modules</Heading>
                <Text color="gray.400" mt={1}>
                    Configure how MyProtect behaves in {guild.name}.
                </Text>
            </Flex>
            <Flex direction="column" alignItems="center" gap={5} px={6} pb={10}>
                <ManageBox name="Rules" description="Build a rules embed with a live preview, then publish it." doc={docs.rules} Modal={RuleModal} guild={guild} />
                <ManageBox name="Verification" description="Gate new members behind a verify button or captcha." doc={docs.verification} Modal={VerificationModal} guild={guild} />
                <ManageBox name="Filtered Channels" description="Secure channel content by topic." doc={docs.channels} Modal={ChannelModal} guild={guild} />
                <ManageBox name="Logging" description="Send mod actions and joins/leaves to a log channel." doc={docs.logging} Modal={LoggingModal} guild={guild} />
            </Flex>
        </BaseLayout>
    )
}

export const getServerSideProps = async (ctx) => {
    const ctxResult = await loadGuildContext(ctx)
    if ("redirect" in ctxResult) return ctxResult

    const { session, guild } = ctxResult

    let docs = { rules: { rules: [], buttons: [] }, channels: {}, verification: {}, logging: {} }
    if (guild) {
        const rules = (await FetchGuildDoc(guild._id, "rules")) as any
        const channels = (await FetchGuildDoc(guild._id, "channels")) as any
        const verification = (await FetchGuildDoc(guild._id, "verification")) as any
        const logging = (await FetchGuildDoc(guild._id, "logging")) as any
        docs = JSON.parse(
            JSON.stringify({
                rules: { rules: [], buttons: [], ...rules },
                channels: channels || {},
                verification: verification || {},
                logging: logging || {},
            })
        )
    }

    return { props: { session, guild, docs } }
}
