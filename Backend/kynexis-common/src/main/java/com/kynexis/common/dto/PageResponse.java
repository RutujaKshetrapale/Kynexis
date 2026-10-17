package com.kynexis.common.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;

    public int getPageNumber() {
        return page;
    }

    public void setPageNumber(int pageNumber) {
        this.page = pageNumber;
    }

    public int getPageSize() {
        return size;
    }

    public void setPageSize(int pageSize) {
        this.size = pageSize;
    }
}
