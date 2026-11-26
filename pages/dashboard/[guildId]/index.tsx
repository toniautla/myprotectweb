import { Button, Flex, Icon, Text } from "@chakra-ui/react"
import BaseLayout from "../../../components/BaseLayout"
import InviteScreen from "../../../components/InviteScreen"
import { loadGuildContext } from "../../../lib/guildProps"
import { FetchGuildDoc } from "../../../lib/DbUtils"
import { FaHammer, FaPlus, FaUser } from "react-icons/fa"
import { BsChatFill } from "react-icons/bs"

const StatBox = ({ icon, color, data, label }) => (
    <Flex
        minW={{ base: "140px", md: "200px" }}
        bg={color}
        p={6}
        rounded="xl"
        justifyContent="space-between"
        gap={4}
        alignItems="center"
        className="animate"
        boxShadow="0 10px 30px rgba(0,0,0,0.3)"
        _hover={{ transform: "translateY(-4px)" }}
    >
        <Flex direction="column" className="animate">
            <Text fontSize={{ base: "2xl", md: "4xl" }} fontWeight="bold" lineHeight="1">
                {data ?? 0}
            </Text>
            <Text fontSize="sm" opacity={0.9} wordBreak="break-word">
                {label}
            </Text>
        </Flex>
        <Icon as={icon} fontSize={{ base: "3xl", md: "5xl" }} opacity={0.85} className="animate" />
    </Flex>
)

export default function GuildDashboard({ guild }) {
    if (!guild) return <InviteScreen />

    return (
        <BaseLayout pageTitle={guild.name} navGuild={guild}>
            <Flex wrap="wrap" justifyContent="center" alignItems="center" gap={5} px={6}>
                <StatBox label="Server Members" color="#1e65f5" data={guild.member_count} icon={FaUser} />
                <StatBox label="Banned Members" color="#f64f52" data={guild.ban_count} icon={FaHammer} />
                <StatBox label="Invites Created" color="#37ef48" data={guild.invite_count} icon={FaPlus} />
                <StatBox
                    label="Server Channels"
                    color="#e646f3"
                    data={(guild.channels || []).length}
                    icon={BsChatFill}
                />
            </Flex>
        </BaseLayout>
    )
}

export const getServerSideProps = async (ctx) => {
    const ctxResult = await loadGuildContext(ctx)
    if ("redirect" in ctxResult) return ctxResult

    const { session, guild } = ctxResult

    // First-time servers go through the quick setup wizard.
    if (guild) {
        const modules = await FetchGuildDoc(guild._id, "modules")
        if (Object.keys(modules).length === 0) {
            return { redirect: { destination: `/dashboard/${guild._id}/quicksetup`, permanent: false } }
        }
    }

    return { props: { session, guild } }
}
