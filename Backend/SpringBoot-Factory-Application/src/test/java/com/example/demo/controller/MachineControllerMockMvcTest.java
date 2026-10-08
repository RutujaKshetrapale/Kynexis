package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import org.springframework.http.MediaType;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.dto.MachineRequest;
import com.example.demo.entity.Machine;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.MachineService;

import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class MachineControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private MachineService machineService;

    private ObjectMapper objectMapper;

    private MachineController machineController;

    private Machine machine;

    @BeforeEach
    void setUp() throws Exception {

        objectMapper = new ObjectMapper();

        machineController = new MachineController(machineService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(machineController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        machine = createMachine(
                1L,
                "CNC Machine",
                "CNC",
                "RUNNING"
        );
    }

    private Machine createMachine(
            Long id,
            String name,
            String type,
            String status) throws Exception {

        Machine machine = new Machine();

        Field idField = Machine.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(machine, id);

        machine.setName(name);
        machine.setType(type);
        machine.setStatus(status);

        return machine;
    }

    private MachineRequest createMachineRequest() {

        MachineRequest request = new MachineRequest();

        request.setName("CNC Machine");
        request.setType("CNC");
        request.setStatus("RUNNING");
        request.setPlantId(1L);

        return request;
    }

    @Test
    void shouldGetMachineByIdSuccessfully() throws Exception {

        when(machineService.getById(1L))
                .thenReturn(machine);

        mockMvc.perform(
                get("/api/machines/1")
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.name").value("CNC Machine"))
        .andExpect(jsonPath("$.type").value("CNC"))
        .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void shouldCreateMachineSuccessfully() throws Exception {

        MachineRequest request = createMachineRequest();

        when(machineService.create(any(MachineRequest.class)))
                .thenReturn(machine);

        mockMvc.perform(
                post("/api/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.name").value("CNC Machine"))
        .andExpect(jsonPath("$.type").value("CNC"))
        .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void shouldGetAllMachinesSuccessfully() throws Exception {

        PageImpl<Machine> page = new PageImpl<>(
                List.of(machine),
                PageRequest.of(0, 10),
                1
        );

        when(machineService.getAll(any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(
                get("/api/machines")
                        .param("page", "0")
                        .param("size", "10")
        )
        .andExpect(status().isOk());
    }

    @Test
    void shouldGetMachinesByPlantSuccessfully() throws Exception {

        PageImpl<Machine> page = new PageImpl<>(
                List.of(machine),
                PageRequest.of(0, 10),
                1
        );

        when(machineService.getByPlant(
                eq(1L),
                any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(
                get("/api/machines/plant/1")
                        .param("page", "0")
                        .param("size", "10")
        )
        .andExpect(status().isOk());
    }

    @Test
    void shouldGetMachinesByStatusSuccessfully() throws Exception {

        PageImpl<Machine> page = new PageImpl<>(
                List.of(machine),
                PageRequest.of(0, 10),
                1
        );

        when(machineService.getByStatus(
                eq("RUNNING"),
                any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(
                get("/api/machines/status/RUNNING")
                        .param("page", "0")
                        .param("size", "10")
        )
        .andExpect(status().isOk());
    }

    @Test
    void shouldGetMachinesByPlantAndStatusSuccessfully() throws Exception {

        PageImpl<Machine> page = new PageImpl<>(
                List.of(machine),
                PageRequest.of(0, 10),
                1
        );

        when(machineService.getByPlantAndStatus(
                eq(1L),
                eq("RUNNING"),
                any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(
                get("/api/machines/plant/1/status/RUNNING")
                        .param("page", "0")
                        .param("size", "10")
        )
        .andExpect(status().isOk());
    }

    @Test
    void shouldSearchMachinesByNameSuccessfully() throws Exception {

        PageImpl<Machine> page = new PageImpl<>(
                List.of(machine),
                PageRequest.of(0, 10),
                1
        );

        when(machineService.searchByName(
                eq("CNC"),
                any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(
                get("/api/machines/search/name")
                        .param("name", "CNC")
                        .param("page", "0")
                        .param("size", "10")
        )
        .andExpect(status().isOk());
    }

    @Test
    void shouldUpdateMachineSuccessfully() throws Exception {

        MachineRequest request = createMachineRequest();

        when(machineService.update(
                eq(1L),
                any(MachineRequest.class)))
                .thenReturn(machine);

        mockMvc.perform(
                put("/api/machines/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.name").value("CNC Machine"))
        .andExpect(jsonPath("$.type").value("CNC"))
        .andExpect(jsonPath("$.status").value("RUNNING"));
    }

    @Test
    void shouldDeleteMachineSuccessfully() throws Exception {

        doNothing()
                .when(machineService)
                .delete(1L);

        mockMvc.perform(
                delete("/api/machines/1")
        )
        .andExpect(status().isNoContent());
    }

    @Test
    void shouldRejectInvalidMachineRequest() throws Exception {

        MachineRequest request = new MachineRequest();

        request.setName("");
        request.setType("");
        request.setStatus("");
        request.setPlantId(null);

        mockMvc.perform(
                post("/api/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
        )
        .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectNegativePageNumber() throws Exception {

        mockMvc.perform(
                get("/api/machines")
                        .param("page", "-1")
                        .param("size", "10")
        )
        .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectInvalidPageSize() throws Exception {

        mockMvc.perform(
                get("/api/machines")
                        .param("page", "0")
                        .param("size", "101")
        )
        .andExpect(status().isBadRequest());
    }
}
