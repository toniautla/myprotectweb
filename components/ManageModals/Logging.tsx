import {
    Box,
    Button,
    Flex,
    FormLabel,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useToast,
} from "@chakra-ui/react"
import { useState } from "react"
import Select from "react-select"
import api from "../../lib/api"
import SelectStyle from "../../styles/selectStyle"

export default function LoggingModal({ onClose, isOpen, doc, guild }) {
    const toast = useToast({ isClosable: true, variant: "solid", position: "bottom-right" })

    const channelOptions = (guild.channels || [])
        .filter((c) => c.type === "text")
        .map((c) => ({ label: `#${c.name}`, value: c.id }))

    const [channelId, setChannelId] = useState<string>(doc.channelId || "")
    const [saving, setSaving] = useState(false)

    const save = async () => {
        setSaving(true)
        try {
            await api("/update_doc", "POST", { guild: guild._id, collection: "logging", channelId })
            toast({ status: "success", title: "Logging saved" })
            onClose()
        } catch (e: any) {
            toast({ status: "error", title: "Failed", description: e.message })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal size="lg" onClose={onClose} isOpen={isOpen}>
            <ModalOverlay />
            <ModalContent bg="gray.900">
                <ModalHeader>
                    Manage: Logging
                    <ModalCloseButton />
                </ModalHeader>
                <ModalBody>
                    <Text color="gray.400" fontSize="sm" mb={4}>
                        MyProtect will post moderation actions (bans, kicks, warns, timeouts, channel locks) and
                        member joins/leaves to this channel.
                    </Text>
                    <Box>
                        <FormLabel>Log Channel</FormLabel>
                        <Select
                            styles={SelectStyle}
                            options={channelOptions}
                            value={channelOptions.find((o) => o.value === channelId) || null}
                            onChange={(o: any) => setChannelId(o?.value || "")}
                            placeholder="Channel for logs…"
                            isClearable
                        />
                    </Box>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="green" fontWeight="normal" onClick={save} isLoading={saving}>
                        Save
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
